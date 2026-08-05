import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { subscribeToMessages, sendMessage, getTeachersForChat, deleteChatMessage, markChatRead, getChannelsForUser, subscribeToChannelMessages, sendChannelMessage } from '../../firebase/firestore';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { LuMessageSquare as MessageSquare, LuFile as FileIcon, LuTrash2 as Trash2, LuDownload as DownloadIcon, LuX as XIcon } from 'react-icons/lu';
import toast from 'react-hot-toast';
import ChatInput from '../../components/ChatInput';
import CustomAudioPlayer from '../../components/CustomAudioPlayer';
import ConfirmModal from '../../components/ConfirmModal';

export default function ParentChat() {
  const { userProfile, currentUser } = useAuth();
  const schoolId = userProfile?.schoolId;
  const studentId = userProfile?.linkedStudentId;

  const [teachers, setTeachers] = useState([]);
  const [activeTeacher, setActiveTeacher] = useState(null);
  
  // Channel State
  const [activeTab, setActiveTab] = useState('dms');
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [loadingChannels, setLoadingChannels] = useState(true);

  const [messages, setMessages] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  
  const messagesEndRef = useRef(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: null, message: '' });
  const [previewFile, setPreviewFile] = useState(null); // { url, type }

  const handleDownload = async (url, customName = 'file') => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      
      let fileName = customName;
      try {
        const decoded = decodeURIComponent(url.split('/').pop().split('?')[0]);
        if (decoded && decoded.includes('.')) {
          fileName = decoded;
        }
      } catch (e) {
        console.warn(e);
      }
      
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Error downloading file:", err);
      window.open(url, '_blank');
    }
  };

  // Fetch all teachers in the school and their chat unread counts
  useEffect(() => {
    let unsubChats = null;
    
    if (schoolId && studentId) {
      getTeachersForChat(schoolId)
        .then(data => {
          data.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
          
          // Now subscribe to chats to get unread counts
          const chatsRef = collection(db, `schools/${schoolId}/chats`);
          const q = query(chatsRef, where("studentId", "==", studentId));
          
          unsubChats = onSnapshot(q, (snapshot) => {
            const chatsMap = new Map();
            snapshot.forEach(doc => {
              chatsMap.set(doc.data().teacherId, doc.data());
            });
            
            const enrichedTeachers = data.map(teacher => {
              const chatData = chatsMap.get(teacher.id);
              return {
                ...teacher,
                unreadCount: chatData?.unreadCount_parent || 0
              };
            });
            
            setTeachers(enrichedTeachers);
            if (enrichedTeachers.length > 0 && !activeTeacher) {
              setActiveTeacher(enrichedTeachers[0]);
            }
            setLoadingTeachers(false);
          });
        })
        .catch(console.error);
    }
    
    return () => {
      if (unsubChats) unsubChats();
    };
  }, [schoolId, studentId]);

  // Fetch Channels
  useEffect(() => {
    const fetchChannels = async () => {
      if (schoolId && studentId && currentUser?.uid) {
        try {
          const studentDoc = await getDoc(doc(db, `schools/${schoolId}/students`, studentId));
          const classId = studentDoc.exists() ? studentDoc.data().classId : null;
          
          if (classId) {
            const data = await getChannelsForUser(schoolId, 'parent', currentUser.uid, classId);
            setChannels(data);
          }
        } catch (error) {
          console.error("Error fetching channels:", error);
        } finally {
          setLoadingChannels(false);
        }
      } else {
        setLoadingChannels(false);
      }
    };
    
    fetchChannels();
  }, [schoolId, studentId, currentUser]);

  // Handle Channel Selection
  useEffect(() => {
    let unsubscribe = null;
    if (activeTab === 'channels' && activeChannel && schoolId) {
      setMessages([]);
      unsubscribe = subscribeToChannelMessages(schoolId, activeChannel.id, (newMessages) => {
        setMessages(newMessages);
      });
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeChannel, activeTab, schoolId]);

  // Subscribe to messages when a teacher is selected
  useEffect(() => {
    let unsubscribe = null;
    
    if (schoolId && studentId && activeTeacher) {
      setMessages([]); // Clear old messages
      unsubscribe = subscribeToMessages(schoolId, studentId, activeTeacher.id, (newMessages) => {
        setMessages(newMessages);
        try {
          const chatRoomId = `${studentId}_${activeTeacher.id}`;
          markChatRead(schoolId, chatRoomId, 'parent');
        } catch (err) {}
      });
      
      // Mark chat as read
      try {
        const chatRoomId = `${studentId}_${activeTeacher.id}`;
        markChatRead(schoolId, chatRoomId, 'parent');
      } catch (err) {
        console.error("Failed to mark chat as read:", err);
      }
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [schoolId, studentId, activeTeacher]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (text, mediaUrl, mediaType) => {
    if (!schoolId || !studentId) return;

    try {
      if (activeTab === 'channels' && activeChannel) {
        if (activeChannel.isReadOnly) {
          toast.error("This channel is read-only.");
          return;
        }
        await sendChannelMessage(
          schoolId,
          activeChannel.id,
          currentUser.uid,
          'parent',
          `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || 'Parent',
          text,
          mediaUrl,
          mediaType
        );
      } else if (activeTab === 'dms' && activeTeacher) {
        await sendMessage(
          schoolId,
          studentId,
          activeTeacher.id,
          currentUser.uid,
          currentUser.uid,
          'parent',
          text,
          mediaUrl,
          mediaType
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message.");
    }
  };

  const handleDeleteMessage = (msgId) => {
    setConfirmModal({
      isOpen: true,
      message: "Are you sure you want to delete this message?",
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        try {
          await deleteChatMessage(schoolId, `${studentId}_${activeTeacher.id}`, msgId);
          toast.success("Message deleted");
        } catch (err) {
          toast.error("Failed to delete message");
        }
      }
    });
  };

  const renderMessageContent = (msg, isMe) => {
    return (
      <div className="flex flex-col gap-2">
        {msg.mediaUrl && (
          <div className="mb-1">
            {msg.mediaType === 'image' && (
              <button 
                onClick={() => setPreviewFile({ url: msg.mediaUrl, type: 'image' })} 
                className="focus:outline-none hover:opacity-90 transition-opacity text-left block"
              >
                <img src={msg.mediaUrl} alt="Attachment" className="max-w-full h-auto max-h-48 rounded-lg object-contain bg-black/5 cursor-zoom-in" />
              </button>
            )}
            {msg.mediaType === 'audio' && (
              <CustomAudioPlayer src={msg.mediaUrl} isMe={isMe} />
            )}
            {msg.mediaType === 'document' && (
              <button 
                onClick={() => setPreviewFile({ url: msg.mediaUrl, type: 'document' })} 
                className="flex items-center gap-2 p-3 bg-black/5 rounded-lg hover:bg-black/10 transition-colors focus:outline-none text-left w-full text-inherit"
              >
                <FileIcon size={20} className="shrink-0" />
                <span className="text-sm font-semibold underline truncate">View Document</span>
              </button>
            )}
          </div>
        )}
        {msg.text && <p className="text-sm whitespace-pre-wrap">{msg.text}</p>}
      </div>
    );
  };

  if (!studentId) {
    return <div className="p-8 text-center text-slate-500">Please link a student to use the chat.</div>;
  }

  if (loadingTeachers) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
      <div className="mb-6 shrink-0">
        <h1 className="text-3xl font-bold text-slate-900">Staff Chat</h1>
        <p className="text-slate-500 mt-1">Communicate directly with teachers.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* Sidebar */}
        <div className="w-full lg:w-80 flex flex-col bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm shrink-0">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-4">
            <h2 className="font-bold text-slate-700">Messaging</h2>
            <div className="flex bg-slate-100 rounded-xl p-1">
              <button 
                onClick={() => { setActiveTab('dms'); setActiveChannel(null); }}
                className={`flex-1 text-sm font-bold py-1.5 rounded-lg transition-colors ${activeTab === 'dms' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Staff DMs
              </button>
              <button 
                onClick={() => { setActiveTab('channels'); setActiveTeacher(null); }}
                className={`flex-1 text-sm font-bold py-1.5 rounded-lg transition-colors ${activeTab === 'channels' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Channels
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {activeTab === 'dms' ? (
              teachers.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">No teachers available.</div>
              ) : (
                teachers.map(teacher => (
                  <button
                    key={teacher.id}
                    onClick={() => setActiveTeacher(teacher)}
                    className={`w-full text-left p-3 rounded-2xl flex items-center gap-3 transition-colors ${
                      activeTeacher?.id === teacher.id 
                        ? 'bg-primary-50 border border-primary-200' 
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                      activeTeacher?.id === teacher.id ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {(teacher.firstName || teacher.name || 'T').charAt(0).toUpperCase()}
                    </div>
                    <div className="overflow-hidden flex-1">
                      <div className="font-bold text-slate-900 truncate flex items-center justify-between">
                        <span>{teacher.firstName ? `${teacher.firstName} ${teacher.lastName}` : (teacher.name || 'Teacher')}</span>
                        {teacher.unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                            {teacher.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 truncate capitalize">{teacher.role || 'Teacher'}</div>
                    </div>
                  </button>
                ))
              )
            ) : (
              loadingChannels ? (
                <div className="p-6 text-center text-slate-500 text-sm">Loading channels...</div>
              ) : channels.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">No channels available.</div>
              ) : (
                channels.map(channel => (
                  <button
                    key={channel.id}
                    onClick={() => setActiveChannel(channel)}
                    className={`w-full text-left p-3 rounded-2xl flex items-center gap-3 transition-colors ${
                      activeChannel?.id === channel.id 
                        ? 'bg-primary-50 border border-primary-200' 
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${
                      activeChannel?.id === channel.id ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      #
                    </div>
                    <div className="overflow-hidden flex-1">
                      <div className="font-bold text-slate-900 truncate flex items-center justify-between">
                        <span>{channel.name}</span>
                      </div>
                      <div className="text-xs text-slate-500 truncate">{channel.description || 'Channel'}</div>
                    </div>
                  </button>
                ))
              )
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden relative">
          {activeTab === 'dms' && activeTeacher && (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-4 shrink-0">
                <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-lg">
                  {(activeTeacher.firstName || activeTeacher.name || 'T').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-lg">
                    {activeTeacher.firstName ? `${activeTeacher.firstName} ${activeTeacher.lastName}` : (activeTeacher.name || 'Teacher')}
                  </h2>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span> Staff
                  </p>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 p-4 md:p-6 overflow-y-auto custom-scrollbar bg-slate-50/30 flex flex-col gap-4">
                {messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center">
                    <MessageSquare size={48} className="mb-4 text-slate-200" />
                    <p>No messages yet.</p>
                    <p className="text-sm">Say hello to start the conversation.</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.senderId === currentUser.uid;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group relative`}>
                        <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 ${
                          isMe 
                            ? 'bg-primary-600 text-white rounded-tr-none' 
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
                        } relative`}>
                          {isMe && (
                            <button 
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="absolute -left-10 top-2 p-2 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 shadow-sm"
                              title="Delete Message"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          {renderMessageContent(msg, isMe)}
                          <span className={`text-xs mt-2 block ${isMe ? 'text-primary-200' : 'text-slate-400'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <ChatInput 
                schoolId={schoolId} 
                chatRoomId={`${studentId}_${activeTeacher.id}`} 
                onSendMessage={handleSendMessage} 
              />
            </>
          )}

          {activeTab === 'dms' && !activeTeacher && (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50/50">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <MessageSquare size={32} className="text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-2">Select a staff member</h3>
              <p className="max-w-xs">Choose a staff member from the sidebar to start a conversation.</p>
            </div>
          )}

          {activeTab === 'channels' && activeChannel && (
            <>
              {/* Channel Header */}
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-lg">
                    #
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-lg">
                      {activeChannel.name}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {activeChannel.description || 'Group Channel'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 p-4 md:p-6 overflow-y-auto custom-scrollbar bg-slate-50/30 flex flex-col gap-4">
                {messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center">
                    <MessageSquare size={48} className="mb-4 text-slate-200" />
                    <p>No messages yet.</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.senderId === currentUser.uid;
                    const isTeacher = msg.senderRole === 'teacher';
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative`}>
                        <div className={`text-xs font-semibold mb-1 ${isTeacher ? 'text-primary-600' : 'text-slate-500'}`}>
                          {msg.senderName}
                        </div>
                        <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 ${
                          isMe 
                            ? 'bg-primary-600 text-white rounded-tr-none' 
                            : (isTeacher ? 'bg-primary-50 border border-primary-100 text-slate-900 rounded-tl-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm')
                        } relative`}>
                          {renderMessageContent(msg, isMe)}
                          
                          <div className={`text-[10px] mt-2 text-right ${isMe ? 'text-primary-100' : 'text-slate-400'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="shrink-0 bg-white">
                {activeChannel.isReadOnly ? (
                  <div className="p-4 text-center text-slate-500 text-sm bg-slate-50 border-t border-slate-200 font-medium">
                    This channel is read-only.
                  </div>
                ) : (
                  <ChatInput onSendMessage={handleSendMessage} />
                )}
              </div>
            </>
          )}

          {activeTab === 'channels' && !activeChannel && (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50/50">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <MessageSquare size={32} className="text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-2">Select a channel</h3>
              <p className="max-w-xs">Choose a channel from the sidebar to view announcements.</p>
            </div>
          )}
        </div>
      </div>
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        message={confirmModal.message}
        title="Delete Message"
      />

      {previewFile && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-[9999] p-4 animate-fade-in">
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <button
              onClick={() => handleDownload(previewFile.url)}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors flex items-center justify-center backdrop-blur-sm"
              title="Download File"
            >
              <DownloadIcon size={22} />
            </button>
            <button
              onClick={() => setPreviewFile(null)}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors flex items-center justify-center backdrop-blur-sm"
              title="Close Preview"
            >
              <XIcon size={22} />
            </button>
          </div>
          <div className="max-w-4xl w-full max-h-[85vh] flex items-center justify-center p-4">
            {previewFile.type === 'image' ? (
              <img
                src={previewFile.url}
                alt="Preview"
                className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              />
            ) : (
              previewFile.url.toLowerCase().includes('.pdf') || previewFile.url.toLowerCase().includes('/raw/upload') ? (
                <iframe 
                  src={previewFile.url} 
                  title="Document Preview"
                  className="w-[85vw] md:w-[70vw] h-[75vh] rounded-2xl border border-white/10 bg-white shadow-2xl"
                />
              ) : (
                <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 text-center flex flex-col items-center gap-6">
                  <div className="w-20 h-20 bg-slate-50 text-slate-500 rounded-3xl flex items-center justify-center shadow-inner">
                    <FileIcon size={40} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 truncate max-w-xs mx-auto">
                      {decodeURIComponent(previewFile.url.split('/').pop().split('?')[0]) || 'Attachment Document'}
                    </h3>
                    <p className="text-sm text-slate-400 mt-2">Preview is not supported for this file extension.</p>
                  </div>
                  <button
                    onClick={() => handleDownload(previewFile.url)}
                    className="w-full py-3 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg"
                  >
                    <DownloadIcon size={18} /> Download to View
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
