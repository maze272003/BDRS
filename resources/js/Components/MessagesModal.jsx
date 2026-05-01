import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Send, ArrowLeft, Loader2, MessageSquareText } from 'lucide-react';
import axios from 'axios';
import { route } from 'ziggy-js';

const Backdrop = ({ onClick }) => (
    <motion.div
        onClick={onClick}
        className="fixed inset-0 bg-black/50 z-50 hidden sm:block"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
    />
);

const MessageBubble = ({ msg }) => {
    const isUser = msg.sender === 'user';

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    return (
        <motion.div
            className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div
                className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm shadow-md whitespace-pre-wrap break-words ${
                    isUser
                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-none'
                        : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none'
                }`}
            >
                {msg.text}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 px-1">
                {formatTime(msg.created_at)}
            </div>
        </motion.div>
    );
};

export default function MessagesModal({ onClose, initialConversation, threadId, onNewMessage }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [adminStatus, setAdminStatus] = useState({ isOnline: false, text: "Offline" });
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        const checkAdminStatus = () => {
            const now = new Date();
            const day = now.getDay(); 
            const hour = now.getHours(); 

            const isWeekday = day >= 1 && day <= 5; 
            const isOfficeHours = hour >= 7 && hour < 17; 

            if (isWeekday && isOfficeHours) {
                setAdminStatus({ isOnline: true, text: "We're here to help!" });
            } else {
                setAdminStatus({ isOnline: false, text: "We'll reply on the next business day" });
            }
        };

        checkAdminStatus();
        const intervalId = setInterval(checkAdminStatus, 60000); 

        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        setMessages(initialConversation || []);
    }, [initialConversation]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            const scrollHeight = textarea.scrollHeight;
            textarea.style.height = `${scrollHeight}px`;
        }
    }, [newMessage]);
    
    useEffect(() => {
        if (!threadId) return;
        if (!window.Echo) return;

        const channel = window.Echo.private(`conversation.${threadId}`);

        channel.listen('.AdminMessageSent', (event) => {
            const reply = event.reply;
            if (reply) {
                setMessages(prevMessages => {
                    const messageId = `reply-${reply.id}`;
                    if (prevMessages.some(message => message.id === messageId)) {
                        return prevMessages;
                    }

                    return [
                        ...prevMessages,
                        {
                            id: messageId,
                            text: reply.message,
                            sender: reply.user?.role === 'resident' ? 'user' : 'admin',
                            created_at: reply.created_at,
                        },
                    ];
                });
            }

            onNewMessage();
        });

        return () => {
            channel.stopListening('.AdminMessageSent');
            window.Echo.leaveChannel(`conversation.${threadId}`);
        };
    }, [threadId, onNewMessage]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        const trimmedMessage = newMessage.trim();
        if (trimmedMessage === '' || isSending) return;

        setIsSending(true);
        const optimisticMessage = {
            id: `temp-${Date.now()}`,
            text: trimmedMessage,
            sender: 'user',
            created_at: new Date().toISOString(),
        };

        setMessages(prevMessages => [...prevMessages, optimisticMessage]);
        setNewMessage('');

        try {
            await axios.post(route('residents.conversations.store'), {
                message: trimmedMessage,
            });
            onNewMessage();
        } catch (error) {
            console.error("Failed to send message:", error);
            setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        } finally {
            setIsSending(false);
        }
    };
    
    const modalVariants = {
        hidden: { opacity: 0, y: "100%" },
        visible: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: "100%" },
    };

    const desktopModalVariants = {
        hidden: { opacity: 0, y: 50, scale: 0.95 },
        visible: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 50, scale: 0.95 },
    };

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

    return (
        <>
            <Backdrop onClick={onClose} />
            <motion.div
                className="fixed inset-0 z-[2147483647] bg-slate-100 dark:bg-slate-900 flex flex-col sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[380px] sm:h-[calc(100vh-48px)] sm:max-h-[600px] sm:rounded-2xl sm:shadow-2xl sm:border sm:border-slate-200 sm:dark:border-slate-700"
                variants={isMobile ? modalVariants : desktopModalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            >
                <div className="flex items-center justify-between p-3.5 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0 sm:rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors sm:hidden">
                            <ArrowLeft size={22} className="text-slate-600 dark:text-slate-300"/>
                        </button>
                        <div className="relative flex-shrink-0">
                            <img className="w-10 h-10 rounded-full" src="/images/gapanlogo.png" alt="Admin"/>
                            <span className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-800 ${adminStatus.isOnline ? 'bg-green-500' : 'bg-slate-400'}`} />
                            {adminStatus.isOnline && <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 animate-ping" />}
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Admin Support</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{adminStatus.text}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors hidden sm:block">
                        <X size={20} className="text-slate-600 dark:text-slate-300"/>
                    </button>
                </div>

                <div className="flex-grow p-4 overflow-y-auto">
                    {messages.length > 0 ? (
                        <div className="flex flex-col gap-4">
                            {messages.map((msg) => (
                                <MessageBubble key={msg.id} msg={msg} />
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400">
                           <MessageSquareText size={48} className="mb-4 text-slate-400" />
                           <h4 className="font-semibold text-lg text-slate-600 dark:text-slate-300">Start a Conversation</h4>
                           <p className="text-sm max-w-xs">Send a message to get help or ask questions about your document requests.</p>
                        </div>
                    )}
                </div>

                <div className="p-3 border-t border-slate-200 dark:border-slate-700 flex-shrink-0 bg-white dark:bg-slate-800 sm:rounded-b-2xl">
                    <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                        <textarea
                            ref={textareaRef}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(e);
                                }
                            }}
                            placeholder="Type a message..."
                            rows={1}
                            className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-transparent rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none max-h-32 text-sm"
                            disabled={isSending}
                        />
                        <button
                            type="submit"
                            className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                            disabled={!newMessage.trim() || isSending}
                        >
                            {isSending ? <Loader2 size={20} className="animate-spin"/> : <Send size={20} />}
                        </button>
                    </form>
                </div>
            </motion.div>
        </>
    );
}
