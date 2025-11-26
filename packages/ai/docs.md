# DurableAgent Architecture and State Propagation

This document explains how `DurableAgent` integrates with Workflow DevKit, how state is stored and propagated between workflow and tool call steps.

## Overview

`DurableAgent` is a class for building AI-powered agents within workflows. It enables AI agents to:

- Maintain state across workflow steps
- Call tools with automatic retries
- Handle interruptions and resumptions gracefully

## Core Components

### 1. DurableAgent (`durable-agent.ts`)

The main orchestrator that:

- Accepts a model, tools, and system prompt
- Manages the conversation loop via `stream()` method
- Delegates LLM streaming to `streamTextIterator`
- Executes tools when the model makes tool calls

### 2. StreamTextIterator (`stream-text-iterator.ts`)

An async generator that:

- Maintains the `conversationPrompt` (message history as `LanguageModelV2Prompt`)
- Calls `doStreamStep` to stream LLM responses
- Yields tool calls when the model requests them
- Receives tool results and adds them to the conversation
- Returns the final conversation when done

### 3. DoStreamStep (`do-stream-step.ts`)

A workflow step function (marked with `"use step"`) that:

- Initializes the language model
- Calls `model.doStream()` with the conversation prompt
- Transforms LLM stream chunks to `UIMessageChunk` format
- Writes chunks to the writable stream
- Returns tool calls and finish reason

## State Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DurableAgent.stream()                          │
│                         (Workflow Context)                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         streamTextIterator()                            │
│                         (Workflow Context)                              │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  conversationPrompt: LanguageModelV2Prompt                      │   │
│   │  - Mutable copy of the initial prompt                           │   │
│   │  - Grows as assistant/tool messages are added                   │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│   ┌───────────────────────────────────────────────────────────────┐     │
│   │              while (!done) loop                                │     │
│   │                                                                │     │
│   │   1. Call doStreamStep() with conversationPrompt              │     │
│   │      (This is a "use step" function - runs in step runtime)   │     │
│   │                                                                │     │
│   │   2. If finish reason is "tool-calls":                        │     │
│   │      - Add assistant message with tool calls to prompt        │     │
│   │      - yield toolCalls (pause, wait for tool results)         │     │
│   │      - Receive toolResults from DurableAgent                  │     │
│   │      - Add tool message with results to prompt                │     │
│   │      - Check stop conditions                                  │     │
│   │                                                                │     │
│   │   3. If finish reason is "stop":                              │     │
│   │      - Add final assistant message to prompt                  │     │
│   │      - Set done = true                                        │     │
│   └───────────────────────────────────────────────────────────────┘     │
│                                    │                                    │
│                                    ▼                                    │
│   return conversationPrompt (final message history)                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
         ▼                          ▼                          ▼
┌─────────────────┐    ┌─────────────────────┐    ┌─────────────────┐
│   executeTool   │    │    executeTool      │    │   executeTool   │
│   (tool #1)     │    │    (tool #2)        │    │   (tool #n)     │
│                 │    │                     │    │                 │
│ tool.execute(   │    │ tool.execute(       │    │ tool.execute(   │
│   input,        │    │   input,            │    │   input,        │
│   {             │    │   {                 │    │   {             │
│     toolCallId, │    │     toolCallId,     │    │     toolCallId, │
│     messages,   │◄───│     messages,       │◄───│     messages,   │
│   }             │    │   }                 │    │   }             │
│ )               │    │ )                   │    │ )               │
└─────────────────┘    └─────────────────────┘    └─────────────────┘
         │                          │                          │
         └──────────────────────────┼──────────────────────────┘
                                    │
                                    ▼
                          Tool Results returned
                          to streamTextIterator
```

## State Propagation

### Message History Flow

1. **Initial Messages**: User provides `messages` to `agent.stream()`
2. **Prompt Standardization**: Messages are converted to `LanguageModelV2Prompt` format
3. **Iterator Maintains State**: `streamTextIterator` keeps a mutable `conversationPrompt`
4. **LLM Responses Added**: After each LLM call, assistant messages are appended
5. **Tool Results Added**: After tool execution, tool messages with results are appended
6. **Final Return**: The complete conversation history is returned from `stream()`

### Message Format

The internal format is `LanguageModelV2Prompt`, an array of messages with roles:

- `system`: System prompt (if provided)
- `user`: User messages with text/image content
- `assistant`: Model responses, including tool call requests
- `tool`: Tool execution results

### The Messages Problem (This TODO)

When a tool's `execute` function is called, the AI SDK expects to receive the conversation history so tools can have context about what led to the tool call:

```typescript
tool.execute(input, {
  toolCallId: string,
  messages: ModelMessage[],  // <-- The conversation history
  abortSignal?: AbortSignal,
})
```

**Current State**: `messages` is passed as an empty array `[]`
**Desired State**: `messages` should contain the conversation history up to the point of the tool call

## Implementation Details

### Why Messages Matter for Tools

Tools may need conversation context to:

1. Understand the full request context
2. Make decisions based on prior tool results
3. Provide more accurate responses
4. Implement conversation-aware functionality

### Current Implementation Gap

In `executeTool()`:

```typescript
const toolResult = await tool.execute(input.value, {
  toolCallId: toolCall.toolCallId,
  // TODO: pass the proper messages to the tool
  messages: [],  // <-- Currently empty
});
```

The challenge: `executeTool` doesn't have access to `conversationPrompt` because it's maintained inside `streamTextIterator`.

### Solution Approach

To fix this, we need to:

1. Modify `streamTextIterator` to yield both tool calls AND the current messages
2. Update `DurableAgent.stream()` to extract messages from the yield value
3. Pass messages through to `executeTool()`

## Workflow DevKit Integration

### Step Functions

`doStreamStep` is marked with `"use step"`, meaning:

- It runs in the step runtime (full Node.js access)
- Results are automatically persisted to the event log
- Automatic retry on failures
- Workflow suspends while step executes

### Stream Handling

- Streams (`WritableStream<UIMessageChunk>`) are serializable across workflow boundaries
- The writable stream receives LLM response chunks in real-time
- Tool outputs are also written to the stream for UI updates

### Durability

The workflow's event log stores:

- Step function results (including LLM responses)
- Tool execution results
- Conversation state between invocations

This enables:

- Resume after failures
- Replay for debugging
- Long-running conversations that survive serverless timeouts

## Related Files

- `packages/ai/src/agent/durable-agent.ts` - Main DurableAgent class
- `packages/ai/src/agent/stream-text-iterator.ts` - Async generator for LLM streaming
- `packages/ai/src/agent/do-stream-step.ts` - Step function for LLM calls
- `packages/ai/src/agent/tools-to-model-tools.ts` - Tool schema conversion
