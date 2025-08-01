import React, { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, Send, X } from "lucide-react";

// Define types for messages
interface Message {
  type: "user" | "bot";
  text: string;
  time: string;
}

export const Chatbot = () => {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [viewportHeight, setViewportHeight] = useState<number>(typeof window !== "undefined" ? window.innerHeight : 0);
  
  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    setIsMobile(window.innerWidth <= 768);
    setViewportHeight(window.innerHeight);
    
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      setViewportHeight(window.innerHeight);
    };
  
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Function to check if device is mobile
  const checkMobile = useCallback(() => {
    setIsMobile(window.innerWidth <= 768);
    setViewportHeight(window.innerHeight);
  }, []);

  // Add this useEffect to handle screen resize
  useEffect(() => {
    // Initial check
    checkMobile();
    
    // Add event listener
    window.addEventListener('resize', checkMobile);
    
    // Clean up
    return () => window.removeEventListener('resize', checkMobile);
  }, [checkMobile]);

  // Improve the auto-resize function for textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const maxHeight = isMobile ? 80 : 100; // Lower max height on mobile
      textareaRef.current.style.height = 
        Math.min(textareaRef.current.scrollHeight, maxHeight) + "px";
    }
  }, [input, isMobile]);

  const formatTime = (): string => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { type: "user", text: input, time: formatTime() };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      // Create context prompt for ImHereTravels
      const contextPrompt = `You are a helpful assistant for ImHereTravels, a travel booking platform. ImHereTravels is a cloud-native booking platform that lets travelers reserve curated group tours instantly and split the cost into automated monthly installments. Here's what you should know:

      - We offer curated group tours that travelers can book instantly
      - Payment plans are available - customers pay a deposit plus automated monthly installments on the 2nd of each month
      - Everything is managed in a user-friendly web app
      - Customers receive personalized email guidance for payment due dates until departure
      - We focus on making travel affordable and accessible through flexible payment options
      - Our tours are group experiences that bring travelers together

      Please answer questions about ImHereTravels, our booking process, payment plans, tours, and travel services. Keep responses friendly, helpful, and focused on travel and booking-related topics. If asked about technical details or backend systems, redirect to the travel experience and customer benefits.

      User question: ${currentInput}`;

      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=AIzaSyAS5TTOjhNR4NY9kf8A_dWHVKOPmgZDRf0', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: contextPrompt
                }
              ]
            }
          ]
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to get response');
      }

      const botResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";

      // Update messages state with the response
      setMessages(prev => [
        ...prev, 
        { type: "bot", text: botResponseText, time: formatTime() }
      ]);
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [
        ...prev, 
        { 
          type: "bot", 
          text: "Sorry, I encountered an error. Please try again or contact our support team for assistance.", 
          time: formatTime() 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Simple text formatting for bot messages
  const formatMessageText = (text: string, isBot: boolean) => {
    if (isBot) {
      // Simple formatting for basic markdown-like patterns
      return text.split('\n').map((line, i) => {
        // Convert **bold** to bold
        let formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Convert *italic* to italic
        formattedLine = formattedLine.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        return (
          <p key={i} className="mb-2" dangerouslySetInnerHTML={{__html: formattedLine || '<br />'}} />
        );
      });
    } else {
      return text.split('\n').map((line, i) => (
        <p key={i} className="mb-2">{line || <br />}</p>
      ));
    }
  };

  // Function to handle closing chat on mobile
  const handleCloseChat = () => {
    setIsOpen(false);
    
    // Reset body styles
    document.body.style.overflow = '';
    document.documentElement.style.height = '';
    document.body.style.height = '';
  };

  return (
    <>
      {!isOpen && (
        <button 
          className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-br from-sky-blue to-seafoam-green text-foreground flex items-center justify-center border-none cursor-pointer shadow-hover hover:scale-105 hover:shadow-soft transition-all duration-300 z-50 animate-float"
          onClick={() => setIsOpen(true)}
          aria-label="Open chat"
        >
          <MessageSquare size={28} className="drop-shadow-sm" />
        </button>
      )}

      {isOpen && (
        <div 
          className={`fixed ${isMobile ? 'inset-0' : 'bottom-6 right-6 w-[400px] h-[650px]'} bg-card/95 backdrop-blur-md shadow-hover rounded-2xl flex flex-col overflow-hidden font-inter z-[9999] border border-sky-blue/30 animate-scale-in`}
          style={isMobile ? {height: `${viewportHeight}px`} : {}}
        >
          <div className="px-6 py-5 bg-gradient-to-r from-sky-blue to-seafoam-green border-b border-sky-blue/20 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-white shadow-card flex items-center justify-center font-bold text-xl text-foreground">
                  IH
                </div>
                <div className="absolute w-4 h-4 bg-seafoam-green rounded-full border-2 border-white bottom-0 right-0 animate-pulse"></div>
              </div>
              <div className="flex flex-col">
                <h3 className="m-0 text-lg font-bold text-foreground">ImHereTravels Assistant</h3>
                <span className="text-sm text-foreground/70 font-medium">Ready to help you explore ✈️</span>
              </div>
            </div>
            <button className="bg-white/20 border-none text-foreground/80 cursor-pointer flex items-center justify-center p-2 rounded-full hover:bg-white/30 hover:text-foreground transition-all duration-200" onClick={handleCloseChat}>
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 bg-gradient-to-b from-soft-white to-background scrollbar-thin scrollbar-thumb-sky-blue/30 scrollbar-track-transparent">
            {messages.length === 0 && (
              <div className="flex items-start gap-4 bg-card rounded-2xl p-6 shadow-card max-w-[90%] mx-auto border border-sky-blue/20 animate-fade-in-up">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-blue to-seafoam-green flex items-center justify-center font-bold text-xl text-foreground shadow-soft">
                    IH
                  </div>
                </div>
                <div>
                  <h3 className="m-0 mb-3 text-lg font-bold text-foreground">Welcome to ImHereTravels! ✈️</h3>
                  <p className="m-0 text-sm text-muted-foreground leading-relaxed">👋 Hi there! I'm here to help you learn about our curated group tours and flexible payment plans. Ask me about our destinations, booking process, or how our monthly payment system works!</p>
                </div>
              </div>
            )}
            
            {messages.map((msg, index) => (
              <div key={index} className={`flex gap-3 max-w-[85%] animate-fade-in-up ${msg.type === 'user' ? 'flex-row-reverse self-end' : 'self-start'}`}>
                {msg.type === "bot" && (
                  <div className="w-10 h-10 flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-blue to-seafoam-green flex items-center justify-center font-bold text-sm text-foreground shadow-soft">
                      IH
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <div className={`p-4 px-5 rounded-2xl border min-w-[40px] max-w-full relative break-words shadow-soft ${
                    msg.type === 'user' 
                      ? 'bg-gradient-to-r from-sky-blue to-seafoam-green text-foreground border-sky-blue/30 rounded-tr-md' 
                      : 'bg-card/80 text-foreground border-border rounded-tl-md backdrop-blur-sm'
                  }`}>
                    {formatMessageText(msg.text, msg.type === 'bot')}
                  </div>
                  <div className={`flex items-center gap-1 text-xs px-2 ${msg.type === 'user' ? 'justify-end' : ''}`}>
                    <span className="text-muted-foreground font-medium">{msg.time}</span>
                    {msg.type === "user" && (
                      <span className="text-seafoam-green font-bold">✓</span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 max-w-[85%] self-start animate-fade-in-up">
                <div className="w-10 h-10 flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-blue to-seafoam-green flex items-center justify-center font-bold text-sm text-foreground shadow-soft">
                    IH
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="p-4 px-5 rounded-2xl min-w-[40px] bg-card/80 text-muted-foreground rounded-tl-md border border-border backdrop-blur-sm shadow-soft">
                    <div className="flex items-center py-2 gap-1">
                      <span className="w-2.5 h-2.5 bg-sky-blue rounded-full inline-block opacity-60 animate-pulse"></span>
                      <span className="w-2.5 h-2.5 bg-seafoam-green rounded-full inline-block opacity-60 animate-pulse" style={{animationDelay: '0.2s'}}></span>
                      <span className="w-2.5 h-2.5 bg-sandy-beige rounded-full inline-block opacity-60 animate-pulse" style={{animationDelay: '0.4s'}}></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div className="p-5 bg-card/90 backdrop-blur-md border-t border-sky-blue/20 flex items-center gap-3">
            <div className="flex items-center bg-background rounded-2xl px-4 py-3 flex-1 border border-sky-blue/30 shadow-soft">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask about our tours, booking, or payment plans..."
                rows={1}
                className="flex-1 border-none bg-transparent px-2 max-h-[100px] font-inter text-sm outline-none resize-none m-0 text-foreground placeholder-muted-foreground overflow-y-auto leading-6"
              />
            </div>
            <button 
              className={`w-12 h-12 rounded-full flex items-center justify-center border-none cursor-pointer transition-all duration-200 flex-shrink-0 shadow-soft ${
                isLoading || !input.trim() 
                  ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                  : 'bg-gradient-to-r from-sky-blue to-seafoam-green text-foreground hover:shadow-hover hover:scale-105 active:scale-95'
              }`}
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;