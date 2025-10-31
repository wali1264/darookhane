import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse, Chat, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';
import { Bot, Mic, Pen, X, Minus, ChevronsUpDown, Send, Sparkles, Wifi, Square } from 'lucide-react';
import { toolDeclarations, executeTool } from '../lib/ai-tools';
import { useNotification } from '../contexts/NotificationContext';

type AssistantMode = 'text' | null;
type Message = {
    from: 'ai' | 'user' | 'system';
    text: string;
};
type VoiceStatus = 'idle' | 'listening' | 'processing' | 'speaking' | 'reconnecting';

// ===================================================================================
// Audio Helper Functions
// ===================================================================================

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}


const systemInstruction = `You are "Shafa-yar AI", an intelligent, proactive, and extremely fast pharmacy data assistant. Your highest priority is speed and directness. You function like an expert human colleague who gives immediate answers.

Core Directives:
1.  **SPEED IS EVERYTHING:** Respond instantly. Be concise. Do not use conversational filler. Get straight to the point.
2.  **BE PROACTIVE, NOT INTERROGATIVE:** Never ask for clarification on simple queries. Use intelligent defaults and handle ambiguity gracefully.
    *   For "expiring drugs", default to 3 months. For "low stock", default to a threshold of 10.
    *   When searching for a drug or supplier (e.g., with \`getDrugStockByName\` or \`getSupplierDebt\`):
        *   If the tool returns a single, direct answer, state it immediately.
        *   If the tool returns \`multipleFound: true\` with a list of \`suggestions\`, YOU MUST present these suggestions to the user so they can clarify. Example: "چندین مورد برای 'آموکسی' پیدا شد. منظورتان کدام است؟\\n- آموکسی سیلین 500mg\\n- شربت آموکسی کلاو"
    *   Your primary goal is to provide information from tools. If a tool reports ambiguity, relay that ambiguity to the user.
3.  **REPORTING IS YOUR MAIN JOB:** Focus on answering questions about Inventory, Suppliers, and Sales using your tools.
4.  **USE TOOLS ALWAYS:** Your knowledge comes ONLY from your tools. Never invent data.
5.  **CLEAR, CONCISE DATA:** Present lists as bullet points.
    *   Example: "داروهای با انقضای نزدیک (۳ ماه آینده):\\n- آموکسی سیلین 500mg: ۱۵۰ عدد\\n- شربت پاراستامول: ۸۰ عدد"
6.  **HANDLE NOT FOUND:** If a tool returns no data or success: false, state it directly and clearly.
7.  **MAINTAIN TASK CAPABILITY:** You can still perform tasks like creating invoices when explicitly asked.
8.  **PERSIAN ONLY:** All interactions must be in Persian.`;


const AIAssistant: React.FC = () => {
  const { showNotification } = useNotification();
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<AssistantMode>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: window.innerHeight - 200 });
  const [size, setSize] = useState({ width: 450, height: 600 });
  
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const resizeStartPos = useRef({ x: 0, y: 0 });
  const initialSize = useRef({ width: 0, height: 0 });

  // Text Assistant State
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([
      { from: 'ai', text: 'سلام! من دستیار هوشمند شفا‌یار هستم. چطور می‌توانم به شما کمک کنم؟' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContentRef = useRef<HTMLDivElement>(null);

  // Voice Assistant State
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef(0);
  const reconnectionAttempt = useRef<number | null>(null);

  useEffect(() => {
    if (chatContentRef.current) {
        chatContentRef.current.scrollTop = chatContentRef.current.scrollHeight;
    }
  }, [messages]);

  const cleanupVoiceResources = useCallback(() => {
    console.log("Cleaning up voice resources...");
    
    if (microphoneStreamRef.current) {
        microphoneStreamRef.current.getTracks().forEach(track => track.stop());
        microphoneStreamRef.current = null;
    }
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
        inputAudioContextRef.current.close().catch(console.error);
        inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
        outputAudioContextRef.current.close().catch(console.error);
        outputAudioContextRef.current = null;
    }
    sessionPromiseRef.current?.then(session => session.close()).catch(console.error);
    sessionPromiseRef.current = null;
    if (reconnectionAttempt.current) clearTimeout(reconnectionAttempt.current);
    setVoiceStatus('idle');
  }, []);
  
  const handleOpenTextMode = useCallback(async () => {
    setActiveMode('text');
    setIsFabOpen(false);
    setIsMinimized(false);
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const newChat = ai.chats.create({
            model: 'gemini-2.5-flash', // Switched to faster model
            config: { 
                systemInstruction,
                tools: [{ functionDeclarations: toolDeclarations }] 
            }
        });
        setChat(newChat);
    } catch (error) {
        console.error("Failed to initialize Gemini Chat:", error);
        setMessages(prev => [...prev, { from: 'system', text: 'خطا در اتصال به دستیار متنی.' }]);
    }
  }, []);
  
  const startVoiceSession = useCallback(async (isReconnecting = false) => {
        if (!isReconnecting) {
          setVoiceStatus('idle');
        }
        setIsFabOpen(false); // Hide other FAB options

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            microphoneStreamRef.current = stream;

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    systemInstruction,
                    responseModalities: [Modality.AUDIO],
                    tools: [{ functionDeclarations: toolDeclarations }],
                },
                callbacks: {
                    onopen: () => {
                        console.log('Live session opened.');
                        if (reconnectionAttempt.current) clearTimeout(reconnectionAttempt.current);
                        setVoiceStatus('listening');
                        const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                        const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                        if (base64Audio) {
                            setVoiceStatus('speaking');
                            const outputCtx = outputAudioContextRef.current!;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                            const source = outputCtx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputCtx.destination);
                            source.addEventListener('ended', () => {
                                audioSourcesRef.current.delete(source);
                                if (audioSourcesRef.current.size === 0) {
                                    setVoiceStatus('listening');
                                }
                            });
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            audioSourcesRef.current.add(source);
                        }
                        
                        if (message.toolCall) {
                             setVoiceStatus('processing');
                             for (const fc of message.toolCall.functionCalls) {
                                try {
                                    const result = await executeTool(fc.name, fc.args);
                                    if (fc.name === 'saveCurrentPurchaseInvoice' && (result as any).success) {
                                        showNotification((result as any).message, 'success');
                                    }
                                    sessionPromiseRef.current?.then(session => {
                                        session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result } } });
                                    });
                                } catch (e) { console.error("Error executing tool in voice mode:", e); }
                            }
                        }
                    },
                    onerror: (e) => {
                        console.error('Live session error:', e);
                        cleanupVoiceResources();
                        setVoiceStatus('reconnecting');
                        reconnectionAttempt.current = window.setTimeout(() => {
                           startVoiceSession(true);
                        }, 2000);
                    },
                    onclose: () => {
                        console.log('Live session closed.');
                        cleanupVoiceResources();
                    },
                }
            });

        } catch (error) {
            console.error("Failed to start voice assistant:", error);
            showNotification('خطا در دسترسی به میکروفون.', 'error');
            cleanupVoiceResources();
        }
  }, [cleanupVoiceResources, showNotification]);

  const handleVoiceToggle = () => {
    if (voiceStatus === 'idle') {
        startVoiceSession();
    } else {
        cleanupVoiceResources();
    }
  };


  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !chat) return;
    const userMessage: Message = { from: 'user', text: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    try {
        let response: GenerateContentResponse = await chat.sendMessage({ message: userMessage.text });
        while(response.functionCalls && response.functionCalls.length > 0) {
            const functionResponses = [];
            for (const fc of response.functionCalls) {
                try {
                    const result = await executeTool(fc.name, fc.args);
                     if (fc.name === 'saveCurrentPurchaseInvoice' && (result as any).success) {
                        showNotification((result as any).message, 'success');
                    }
                    functionResponses.push({ id: fc.id, name: fc.name, response: { result } });
                } catch (e) {
                    functionResponses.push({ id: fc.id, name: fc.name, response: { result: { success: false, message: `خطای داخلی: ${e}` } } });
                }
            }
            response = await chat.sendMessage({ toolResponses: { functionResponses } });
        }
        const aiResponse: Message = { from: 'ai', text: response.text };
        setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
        const errorMessage: Message = { from: 'system', text: `متاسفانه خطایی رخ داد: ${error}` };
        setMessages(prev => [...prev, errorMessage]);
    } finally {
        setIsLoading(false);
    }
  };

  const closeAssistant = useCallback(() => {
    setActiveMode(null);
    setChat(null); // Reset text chat session
    setMessages([{ from: 'ai', text: 'سلام! من دستیار هوشمند شفا‌یار هستم. چطور می‌توانم به شما کمک کنم؟' }]);
  }, []);

  // Drag & Resize handlers for Text Mode
  const handleMouseDownDrag = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    dragStartPos.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };
  const handleMouseDownResize = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isResizing.current = true;
    resizeStartPos.current = { x: e.clientX, y: e.clientY };
    initialSize.current = size;
    e.stopPropagation();
  };
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging.current) {
      setPosition({ x: e.clientX - dragStartPos.current.x, y: e.clientY - dragStartPos.current.y });
    }
    if (isResizing.current) {
      setSize({
        width: Math.max(350, initialSize.current.width + (e.clientX - resizeStartPos.current.x)),
        height: Math.max(400, initialSize.current.height + (e.clientY - resizeStartPos.current.y)),
      });
    }
  }, []);
  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    isResizing.current = false;
  }, []);
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);


  const renderVoiceFab = () => {
    const statusInfo = {
        listening: { text: "در حال گوش دادن...", color: "bg-blue-500", icon: <Mic size={32}/>, pulse: true },
        processing: { text: "در حال پردازش...", color: "bg-yellow-500", icon: <Sparkles size={32}/>, pulse: true },
        speaking: { text: "در حال صحبت...", color: "bg-green-500", icon: <Bot size={32}/>, pulse: false },
        reconnecting: { text: "در حال اتصال...", color: "bg-orange-500", icon: <Wifi size={32}/>, pulse: true },
        idle: { text: "شروع مکالمه", color: "bg-gray-700", icon: <Mic size={24}/>, pulse: false }
    }[voiceStatus];
    
    if (voiceStatus === 'idle') return null; // Handled by the standard FAB

    return (
        <button 
            onClick={handleVoiceToggle} 
            className={`fixed bottom-6 left-6 z-[100] w-20 h-20 rounded-full text-white flex items-center justify-center shadow-2xl transition-all duration-300 ${statusInfo.color} ${statusInfo.pulse ? 'animate-pulse' : ''}`}
            title="پایان مکالمه"
        >
            {statusInfo.icon}
        </button>
    );
  };

  return (
    <>
      {/* Draggable/Resizable Chat Window for Text Mode */}
      {activeMode === 'text' && (
         <div 
            ref={chatWindowRef}
            className={`fixed bg-gray-800/80 backdrop-blur-md border border-gray-600 rounded-lg shadow-2xl flex flex-col transition-all duration-300 ease-in-out z-[99] ${isMinimized ? 'h-14' : ''}`}
            style={{ 
                top: position.y, 
                left: position.x, 
                width: size.width, 
                height: isMinimized ? 'auto' : size.height,
            }}
        >
           <div 
                className="h-14 bg-gray-700/50 flex justify-between items-center px-4 cursor-grab active:cursor-grabbing border-b border-gray-600 flex-shrink-0"
                onMouseDown={handleMouseDownDrag}
            >
             <div className="flex items-center gap-2 font-bold">
                <Pen size={18} /><span>دستیار متنی</span>
             </div>
             <div className="flex items-center gap-2">
                <button onClick={() => setIsMinimized(!isMinimized)} className="p-1 text-gray-400 hover:text-white hover:bg-gray-600 rounded-full"><Minus size={18}/></button>
                <button onClick={closeAssistant} className="p-1 text-gray-400 hover:text-white hover:bg-red-500/50 rounded-full"><X size={18}/></button>
             </div>
           </div>
           
           {!isMinimized && (
            <>
                <div ref={chatContentRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-3 ${msg.from === 'user' ? 'justify-end' : ''} ${msg.from === 'system' ? 'justify-center' : ''}`}>
                             {msg.from === 'ai' && <div className="w-8 h-8 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center"><Sparkles size={16} /></div>}
                             <div className={`max-w-xs md:max-w-md p-3 rounded-lg ${
                                 msg.from === 'user' ? 'bg-gray-600' :
                                 msg.from === 'ai' ? 'bg-gray-700' :
                                 'bg-red-900/50 text-red-300'
                             }`}>
                                <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                         <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center animate-pulse"><Sparkles size={16} /></div>
                            <div className="max-w-xs md:max-w-md p-3 rounded-lg bg-gray-700">
                                <p className="text-sm text-gray-400">در حال پردازش...</p>
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-gray-600">
                     <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}>
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="دستور خود را تایپ کنید..."
                                className="w-full bg-gray-600/50 border border-gray-500 rounded-lg py-2 pl-4 pr-10 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                                disabled={isLoading}
                                autoFocus
                            />
                            <button type="submit" disabled={isLoading || !inputValue.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed">
                                <Send size={20} />
                            </button>
                        </div>
                     </form>
                </div>
            </>
           )}
           
           {!isMinimized && (
              <div 
                className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
                onMouseDown={handleMouseDownResize}
              >
                 <ChevronsUpDown size={12} className="text-gray-500 rotate-45"/>
              </div>
           )}
         </div>
      )}
      
      {/* Main FAB Group */}
      {voiceStatus !== 'idle' ? renderVoiceFab() : (
        <div className="fixed bottom-6 left-6 z-[100] flex flex-col items-center gap-3">
            <div className={`transition-all duration-300 ease-in-out flex flex-col items-center gap-3 ${isFabOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
              <button onClick={handleVoiceToggle} className="w-12 h-12 rounded-full bg-gray-700 text-white flex items-center justify-center shadow-lg hover:bg-red-500 transition-colors" title="دستیار صوتی">
                <Mic size={24} />
              </button>
              <button onClick={handleOpenTextMode} className="w-12 h-12 rounded-full bg-gray-700 text-white flex items-center justify-center shadow-lg hover:bg-blue-500 transition-colors" title="دستیار متنی">
                <Pen size={24} />
              </button>
            </div>
            <button onClick={() => setIsFabOpen(prev => !prev)} className={`w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xl hover:bg-blue-700 transition-transform duration-300 ${isFabOpen ? 'rotate-45' : ''}`}>
              {isFabOpen ? <X size={32} /> : <Bot size={32} />}
            </button>
        </div>
      )}
    </>
  );
};

export default AIAssistant;
