import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getChatThreads, subscribeToMessages } from '../../firebase/firestore';
import { LuMessageSquare as MessageSquare, LuFile as FileIcon, LuSearch as Search, LuShieldAlert as ShieldAlert } from 'react-icons/lu';
import CustomAudioPlayer from '../../components/CustomAudioPlayer';

export default function ChatMonitor() {
  const { userProfile } = useAuth();
  const schoolId = userProfile?.schoolId;

  const [threads, setThreads] = useState([]);
  const [filteredThreads, setFilteredThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const messagesEndRef = useRef(null);

  // Fetch all chat threads for the school
  useEffect(() => {
    if (schoolId) {
      getChatThreads(schoolId)
        .then(data => {
          setThreads(data);
          setFilteredThreads(data);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [schoolId]);

  // Handle Search Filtering
  useEffect(() => {
    const lowerQuery = searchQuery.toLowerCase();
    setFilteredThreads(
      threads.filter(t => 
        (t.lastMessage && t.lastMessage.toLowerCase().includes(lowerQuery)) ||
        (t.studentId && t.studentId.toLowerCase().includes(lowerQuery)) ||
        (t.teacherId && t.teacherId.toLowerCase().includes(lowerQuery))
      )
    );
  }, [searchQuery, threads]);

  // Subscribe to messages when a thread is selected
  useEffect(() => {
    let unsubscribe = null;
    if (schoolId && activeThread) {
      setMessages([]); // Clear old messages
      unsubscribe = subscribeToMessages(schoolId, activeThread.studentId, activeThread.teacherId, (newMessages) => {
        setMessages(newMessages);
      });
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [schoolId, activeThread]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const renderMessageContent = (msg, isTeacher) => {
    return (
      <div className="flex flex-col gap-2">
        {msg.mediaUrl && (
          <div className="mb-1">
            {msg.mediaType === 'image' && (
              <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer">
                <img src={msg.mediaUrl} alt="Attachment" className="max-w-full h-auto max-h-48 rounded-lg object-contain bg-black/5" />
              </a>
            )}
            {msg.mediaType === 'audio' && (
              <CustomAudioPlayer src={msg.mediaUrl} isMe={isTeacher} />
            )}
            {msg.mediaType === 'document' && (
              <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-black/5 rounded-lg hover:bg-black/10 transition-colors">
                <FileIcon size={20} />
                <span className="text-sm font-semibold underline">View Document</span>
              </a>
            )}
          </div>
        )}
        {msg.text && <p className="text-sm whitespace-pre-wrap">{msg.text}</p>}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
      <div className="mb-6 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <ShieldAlert className="text-red-500" />
            Chat Monitor
          </h1>
          <p className="text-slate-500 mt-1">Audit and monitor all communications between parents and staff.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* Sidebar - Threads List */}
        <div className="w-full lg:w-96 flex flex-col bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm shrink-0">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search threads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {filteredThreads.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">No chat threads found.</div>
            ) : (
              filteredThreads.map(thread => (
                <button
                  key={thread.id}
                  onClick={() => setActiveThread(thread)}
                  className={`w-full text-left p-3 rounded-2xl flex items-start gap-3 transition-colors ${
                    activeThread?.id === thread.id 
                      ? 'bg-red-50 border border-red-200' 
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    activeThread?.id === thread.id ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {thread.teacherId ? thread.teacherId.substring(0,2).toUpperCase() : '..'}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <div className="font-bold text-slate-900 truncate text-sm">
                      Thread: {thread.studentId}
                    </div>
                    <div className="text-xs text-slate-500 truncate">Staff: {thread.teacherId}</div>
                    <div className="text-xs text-slate-400 truncate mt-1">
                      {thread.lastMessage || 'No recent messages'}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Chat Viewer Area */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden relative">
          {activeThread ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-100 bg-red-50 flex items-center gap-4 shrink-0">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-lg">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-lg">
                    Monitoring: Thread {activeThread.id}
                  </h2>
                  <p className="text-xs text-red-600 font-semibold uppercase tracking-wider">
                    Read-Only Audit Mode
                  </p>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 p-4 md:p-6 overflow-y-auto custom-scrollbar bg-slate-50/30 flex flex-col gap-4">
                {messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center">
                    <MessageSquare size={48} className="mb-4 text-slate-200" />
                    <p>No messages in this thread yet.</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isTeacher = msg.senderRole === 'teacher';
                    return (
                      <div key={msg.id} className={`flex ${isTeacher ? 'justify-end' : 'justify-start'} w-full`}>
                        <div className={`max-w-[85%] md:max-w-[75%] flex flex-col ${isTeacher ? 'items-end' : 'items-start'}`}>
                          <span className="text-xs font-bold text-slate-500 mb-1 px-1 uppercase tracking-wide">
                            {isTeacher ? 'Teacher / Staff' : 'Parent'} (ID: {msg.senderId})
                          </span>
                          <div className={`rounded-2xl p-4 w-full ${
                            isTeacher 
                              ? 'bg-slate-800 text-white rounded-tr-none' 
                              : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
                          }`}>
                            {renderMessageContent(msg, isTeacher)}
                            <span className={`text-xs mt-2 block ${isTeacher ? 'text-slate-400' : 'text-slate-400'}`}>
                              {new Date(msg.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-center p-8 bg-slate-50/50">
              <div>
                <ShieldAlert size={48} className="mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-medium text-slate-600">Select a thread to monitor</p>
                <p className="text-sm mt-1">Audit logs are read-only and confidential.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
