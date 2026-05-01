import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, usePage, router } from "@inertiajs/react";
import { format, formatDistanceToNow } from 'date-fns';
import axios from 'axios';

// --- Helper & Icon Components ---
const UserAvatar = ({ user, className = 'w-10 h-10' }) => {
    const getInitials = (name) => {
        if (!name) return '?';
        const names = name.split(' ');
        return (names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}` : name.substring(0, 2)).toUpperCase();
    };
    const colorKey = (user.email?.charCodeAt(0) || 65) + (user.email?.charCodeAt(1) || 66);
    const colors = ['bg-blue-200 text-blue-800', 'bg-emerald-200 text-emerald-800', 'bg-violet-200 text-violet-800', 'bg-rose-200 text-rose-800', 'bg-amber-200 text-amber-800', 'bg-indigo-200 text-indigo-800'];
    const color = colors[colorKey % colors.length];
    return (<div className={`${className} rounded-full flex-shrink-0 flex items-center justify-center`}><div className={`w-full h-full flex items-center justify-center rounded-full ${color}`}><span className="text-sm font-bold">{getInitials(user.full_name)}</span></div></div>);
};
const BackIcon = (props) => ( <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg> );
const SearchIcon = (props) => ( <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg> );
const SendIcon = ({ processing }) => ( <svg className={`w-6 h-6 transition-all duration-300 ease-in-out ${processing ? 'animate-spin' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>);

// --- Main Component ---
export default function Messages() {
    const { messages: initialMessages, auth } = usePage().props;
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');
    const [activeConversationId, setActiveConversationId] = useState(null);
    const chatContainerRef = useRef(null);
    const replyTextareaRef = useRef(null);
    
    const [replyMessage, setReplyMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const reloadMessages = useCallback(() => {
        router.reload({
            only: ['messages'],
            preserveState: true,
            preserveScroll: true,
        });
    }, []);

    const conversations = useMemo(() => {
        const userGroups = new Map();
        initialMessages.forEach(msg => {
            if (!userGroups.has(msg.user.id)) userGroups.set(msg.user.id, { user: msg.user, thread: [] });
            userGroups.get(msg.user.id).thread.push(msg);
        });
        return Array.from(userGroups.values()).sort((a, b) => {
            const lastMsgTime = (conv) => new Date(conv.thread.flatMap(t => [t, ...(t.replies || [])]).sort((x, y) => new Date(y.created_at) - new Date(x.created_at))[0].created_at);
            return lastMsgTime(b) - lastMsgTime(a);
        });
    }, [initialMessages]);

    const subjectsAndFilters = useMemo(() => ['All', 'Unread', 'General Inquiry', 'Feedback', 'Support', 'Complaint'], []);

    const filteredConversations = useMemo(() => {
        return conversations
            .filter(conv => {
                const searchableText = `${conv.user.full_name} ${conv.user.email}`.toLowerCase();
                return searchableText.includes(searchTerm.toLowerCase());
            })
            .filter(conv => {
                if (activeFilter === 'All') return true;
                if (activeFilter === 'Unread') return conv.thread.some(msg => msg.status === 'unread' || msg.replies.some(r => r.status === 'unread' && r.user_id !== auth.user.id));
                return conv.thread.some(msg => msg.subject === activeFilter);
            });
    }, [conversations, activeFilter, searchTerm, auth.user.id]);

    const activeConversation = useMemo(() => conversations.find(c => c.user.id === activeConversationId), [activeConversationId, conversations]);

    const chatHistory = useMemo(() => {
        if (!activeConversation) return [];
        return activeConversation.thread
            .flatMap(msg => [{ ...msg, type: 'original' }, ...(msg.replies || []).map(r => ({ ...r, type: 'reply' }))])
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }, [activeConversation]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory]);
    
    useEffect(() => {
        if (!activeConversationId) return;
        if (!window.Echo) return;

        const activeConv = conversations.find(c => c.user.id === activeConversationId);
        if (!activeConv || activeConv.thread.length === 0) return;
        
        const threadId = activeConv.thread[0].id;
        const channel = window.Echo.private(`conversation.${threadId}`);

        channel.listen('.ResidentMessageSent', reloadMessages);
        channel.listen('.AdminMessageSent', reloadMessages);

        return () => {
            channel.stopListening('.ResidentMessageSent');
            channel.stopListening('.AdminMessageSent');
            window.Echo.leaveChannel(`conversation.${threadId}`);
        };
    }, [activeConversationId, conversations, reloadMessages]);

    useEffect(() => {
        if (!window.Echo || !auth?.user?.id) return;

        const channel = window.Echo.private(`user.${auth.user.id}.messages`);

        channel.listen('.UnreadMessageCountUpdated', reloadMessages);

        return () => {
            channel.stopListening('.UnreadMessageCountUpdated');
            window.Echo.leave(`user.${auth.user.id}.messages`);
        };
    }, [auth?.user?.id, reloadMessages]);

    const handleSelectConversation = (conversation) => {
        setActiveConversationId(conversation.user.id);
        const isUnread = conversation.thread.some(message => message.status === 'unread' || message.replies.some(r => r.status === 'unread' && r.user_id !== auth.user.id));
        
        if (isUnread) {
            const parentMessage = conversation.thread[0];
            router.post(route('admin.messages.mark-as-read', parentMessage.id), {}, {
                preserveState: true,
                preserveScroll: true,
            });
        }
    };
    
    const handleReply = async (e) => {
        e.preventDefault();
        if (!activeConversation || !replyMessage.trim() || isProcessing) return;
        
        setIsProcessing(true);
        const lastMessageInThread = activeConversation.thread[activeConversation.thread.length - 1];
        
        try {
            await axios.post(route('admin.messages.storeReply', lastMessageInThread.id), {
                reply_message: replyMessage,
            });
            setReplyMessage('');
            if (replyTextareaRef.current) replyTextareaRef.current.style.height = 'auto';
            reloadMessages();
        } catch (error) {
            console.error("Failed to send reply:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleTextareaInput = (e) => {
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
        setReplyMessage(e.target.value);
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Messages" />
            <div className="md:flex md:h-[calc(100vh-4rem)]">
                <div className={`w-full md:w-96 flex flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 ${activeConversationId ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">Inbox</h3>
                        <div className="relative">
                            <SearchIcon className="w-5 h-5 text-slate-400 absolute top-1/2 left-3 -translate-y-1/2" />
                            <input type="search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search..." className="w-full pl-10 pr-4 py-2 text-sm border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 rounded-lg focus:ring-blue-500 focus:border-blue-500"/>
                        </div>
                        <div className="flex space-x-2 mt-4 overflow-x-auto pb-2 -mx-4 px-4">
                            {subjectsAndFilters.map((subject) => (
                                <button key={subject} onClick={() => setActiveFilter(subject)} className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors flex-shrink-0 ${activeFilter === subject ? 'bg-blue-600 text-white shadow' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>{subject}</button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-grow overflow-y-auto">
                        {filteredConversations.map((conv) => <ConversationListItem key={conv.user.id} conv={conv} authUserId={auth.user.id} isActive={activeConversationId === conv.user.id} onSelect={handleSelectConversation}/>)}
                    </div>
                </div>

                <div className={`flex-1 ${!activeConversationId && 'hidden md:flex md:items-center md:justify-center'}`}>
                    {activeConversation ? (
                        <div key={activeConversation.user.id} className="fixed inset-0 pt-16 md:relative md:pt-0 flex flex-col w-full h-full bg-slate-50 dark:bg-slate-900 animate-fade-in">
                            <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3 flex-shrink-0 bg-white dark:bg-slate-800 shadow-sm">
                                <button onClick={() => setActiveConversationId(null)} className="md:hidden p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><BackIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" /></button>
                                <UserAvatar user={activeConversation.user} />
                                <div><h4 className="font-bold text-slate-900 dark:text-slate-100">{activeConversation.user.full_name}</h4><p className="text-xs text-slate-500">{activeConversation.user.email}</p></div>
                            </div>
                            <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-4 bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800/50">
                                {chatHistory.map(item => <ChatBubble key={`${item.type}-${item.id}`} item={item} isAdmin={item.user_id === auth.user.id} />)}
                            </div>
                            <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm flex-shrink-0">
                                <form onSubmit={handleReply} className="flex items-end gap-3">
                                    <textarea ref={replyTextareaRef} value={replyMessage} onInput={handleTextareaInput} className="w-full p-2.5 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow resize-none max-h-40" rows="1" placeholder="Type your message..."/>
                                    <button type="submit" disabled={isProcessing || !replyMessage.trim()} className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex-shrink-0 shadow hover:shadow-md"><SendIcon processing={isProcessing} /></button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-slate-500 dark:text-slate-400 p-4">
                            <div>
                                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-20 w-20 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                <h3 className="mt-2 text-lg font-medium text-slate-800 dark:text-slate-200">Welcome to your Inbox</h3>
                                <p className="mt-1 text-sm text-slate-500">Select a conversation to begin.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

// --- Sub Components ---
const ConversationListItem = ({ conv, isActive, onSelect, authUserId }) => {
    const flatThread = conv.thread.flatMap(t => [t, ...(t.replies || [])]).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const lastMessage = flatThread[0];
    
    // THE FIX: Check if the entire conversation thread is considered unread.
    const isUnread = conv.thread.some(msg => msg.status === 'unread' || msg.replies.some(r => r.status === 'unread' && r.user_id !== authUserId));

    return (
        <button onClick={() => onSelect(conv)} className={`w-full text-left p-3 border-b border-slate-200 dark:border-slate-700 transition-colors duration-150 relative flex items-center gap-3 ${isActive ? 'bg-blue-50 dark:bg-slate-900/50' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
            {isActive && <div className="absolute left-0 top-0 h-full w-1.5 bg-blue-500"></div>}
            <div className="relative flex-shrink-0">
                <UserAvatar user={conv.user} />
                {/* Show a simple dot indicator if unread, not a number */}
                {isUnread && <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-blue-500 ring-2 ring-white dark:ring-slate-800" />}
            </div>
            <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-center">
                    <p className={`font-bold text-slate-800 dark:text-slate-200 truncate ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`}>{conv.user.full_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0 ml-2">{formatDistanceToNow(new Date(lastMessage.created_at), { addSuffix: true })}</p>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 truncate mt-0.5">{lastMessage.message}</p>
            </div>
        </button>
    );
};

const ChatBubble = ({ item, isAdmin }) => (
    <div className={`flex my-1.5 animate-fade-in-up ${isAdmin ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-xl lg:max-w-2xl px-4 py-2.5 rounded-2xl shadow-sm ${isAdmin ? 'bg-blue-600 text-white rounded-br-lg' : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-lg'}`}>
            {item.type === 'original' && (<p className={`font-bold text-xs pb-1 mb-1.5 border-b ${isAdmin ? 'border-blue-400' : 'border-slate-300 dark:border-slate-600'}`}>{item.subject}</p>)}
            <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{item.message}</p>
            <p className={`text-xs mt-1.5 ${isAdmin ? 'text-blue-200' : 'text-slate-500 dark:text-slate-400'} text-right`}>{format(new Date(item.created_at), 'p')}</p>
        </div>
    </div>
);
