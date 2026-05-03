import { useState, useEffect, useRef } from "react";
import { 
  useListOpenaiConversations, 
  useCreateOpenaiConversation, 
  useGetOpenaiConversation,
  useListOpenaiMessages,
  useDeleteOpenaiConversation,
  getListOpenaiConversationsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Plus, MessageSquare, Trash2, Bot, User } from "lucide-react";

interface StreamingMessage {
  role: "assistant";
  content: string;
}

export default function AI() {
  const { data: conversations = [] } = useListOpenaiConversations();
  const createConversation = useCreateOpenaiConversation();
  const deleteConversation = useDeleteOpenaiConversation();
  const queryClient = useQueryClient();
  
  const [activeId, setActiveId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Automatically select the first conversation if none is selected
  useEffect(() => {
    if (!activeId && conversations.length > 0) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  const { data: messages = [], refetch: refetchMessages } = useListOpenaiMessages(activeId || 0, {
    query: { enabled: !!activeId }
  });

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingMessage]);

  const handleNewConversation = () => {
    createConversation.mutate({ data: { title: "New Conversation" } }, {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        setActiveId(res.id);
      }
    });
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteConversation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        if (activeId === id) setActiveId(null);
      }
    });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeId) return;

    const userMsg = input;
    setInput("");
    
    // Add user message locally immediately via query cache update for snappiness
    // For simplicity here, we'll just rely on the refetch after the stream starts

    setStreamingMessage({ role: "assistant", content: "" });

    try {
      const response = await fetch(`/api/openai/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMsg })
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // Refetch messages to get the user message we just sent from the DB
      refetchMessages();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '));
        
        for (const line of lines) {
          const dataStr = line.replace('data: ', '').trim();
          if (dataStr === '[DONE]') continue;
          
          try {
            const data = JSON.parse(dataStr);
            if (data.done) {
              // Complete, refresh the full history from server
              setStreamingMessage(null);
              refetchMessages();
              queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() }); // Updates title
            } else if (data.content) {
              setStreamingMessage(prev => prev ? { ...prev, content: prev.content + data.content } : null);
            }
          } catch (e) {
            console.error("Failed to parse SSE chunk", e);
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setStreamingMessage(null);
      refetchMessages();
    }
  };

  return (
    <div className="flex h-full p-6 gap-6">
      {/* Sidebar */}
      <Card className="w-80 flex flex-col bg-card/50">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-lg">Conversations</h2>
          <Button size="icon" variant="ghost" onClick={handleNewConversation}>
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3 flex flex-col gap-2">
            {conversations.map(conv => (
              <div 
                key={conv.id}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${activeId === conv.id ? 'bg-primary/20 text-primary-foreground border border-primary/30' : 'hover:bg-muted'}`}
                onClick={() => setActiveId(conv.id)}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm font-medium">{conv.title}</span>
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className={`h-6 w-6 opacity-0 hover:bg-destructive/20 hover:text-destructive group-hover:opacity-100 ${activeId === conv.id ? 'opacity-100' : ''}`}
                  onClick={(e) => handleDelete(conv.id, e)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {conversations.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">
                No conversations yet.
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col border-primary/20 shadow-[0_0_30px_rgba(0,255,136,0.05)]">
        {activeId ? (
          <>
            <div className="p-4 border-b bg-card">
              <h2 className="font-semibold flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" /> PayDuka Business Agent
              </h2>
            </div>
            
            <div className="flex-1 overflow-auto p-6" ref={scrollRef}>
              <div className="max-w-3xl mx-auto space-y-6">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-secondary text-secondary-foreground' : 'bg-primary/20 text-primary border border-primary/30'}`}>
                      {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div className={`p-4 rounded-xl max-w-[85%] whitespace-pre-wrap ${msg.role === 'user' ? 'bg-secondary text-secondary-foreground rounded-tr-sm' : 'bg-card border rounded-tl-sm'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                
                {streamingMessage && (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-primary/20 text-primary border border-primary/30">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="p-4 rounded-xl max-w-[85%] whitespace-pre-wrap bg-card border rounded-tl-sm border-primary/30 shadow-[0_0_10px_rgba(0,255,136,0.1)]">
                      {streamingMessage.content}
                      <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse align-middle" />
                    </div>
                  </div>
                )}
                
                {messages.length === 0 && !streamingMessage && (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground pt-20">
                    <Bot className="h-16 w-16 mb-4 text-primary/30" />
                    <p className="text-lg font-medium text-foreground">How can I help your business today?</p>
                    <p className="text-sm mt-2 max-w-md text-center">Ask me about sales trends, inventory optimization, or strategies to increase revenue.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t bg-card/80 backdrop-blur">
              <form onSubmit={handleSend} className="max-w-3xl mx-auto relative">
                <Input 
                  placeholder="Ask the AI agent..." 
                  className="pr-12 h-14 text-base bg-background/50 border-primary/30 focus-visible:ring-primary/50"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  disabled={!!streamingMessage}
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 text-primary-foreground hover:shadow-[0_0_15px_rgba(0,255,136,0.5)]"
                  disabled={!input.trim() || !!streamingMessage}
                >
                  <Send className="h-5 w-5" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="h-16 w-16 mb-4 text-muted/50" />
            <p>Select a conversation or start a new one</p>
            <Button className="mt-4" onClick={handleNewConversation}>Start Chat</Button>
          </div>
        )}
      </Card>
    </div>
  );
}