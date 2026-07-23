import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { subscribeToMessages, sendMessage, getTeachersForChat, deleteChatMessage } from '../../firebase/firestore';
import { LuMessageSquare as MessageSquare, LuFile as FileIcon, LuTrash2 as Trash2 } from 'react-icons/lu';
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
  const [messages, setMessages] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  
  const messagesEndRef = useRef(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: null, message: '' });

  // Fetch all teachers in the school
  useEffect(() => {
    if (schoolId) {
      getTeachersForChat(schoolId)
        .then(data => {
          data.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
          setTeachers(data);
          if (data.length > 0) setActiveTeacher(data[0]);
        })
        .catch(console.error)
        .finally(() => setLoadingTeachers(false));
    }
  }, [schoolId]);

  // Subscribe to messages when a teacher is selected
  useEffect(() => {
    let unsubscribe = null;
    
    if (schoolId && studentId && activeTeacher) {
      setMessages([]); // Clear old messages
      unsubscribe = subscribeToMessages(schoolId, studentId, activeTeacher.id, (newMessages) => {
        setMessages(newMessages);
      });
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
    if (!schoolId || !studentId || !activeTeacher) return;

    try {
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
              <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer">
                <img src={msg.mediaUrl} alt="Attachment" className="max-w-full h-auto max-h-48 rounded-lg object-contain bg-black/5" />
              </a>
            )}
            {msg.mediaType === 'audio' && (
              <CustomAudioPlayer src={msg.mediaUrl} isMe={isMe} />
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
        
        {/* Sidebar - Teachers List */}
        <div className="w-full lg:w-80 flex flex-col bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm shrink-0">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-bold text-slate-700">Staff Members</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {teachers.length === 0 ? (
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
                  <div className="overflow-hidden">
                    <div className="font-bold text-slate-900 truncate">
                      {teacher.firstName ? `${teacher.firstName} ${teacher.lastName}` : (teacher.name || 'Teacher')}
                    </div>
                    <div className="text-xs text-slate-500 truncate capitalize">{teacher.role || 'Teacher'}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden relative">
          {activeTeacher ? (
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
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-center p-8 bg-slate-50/50">
              <div>
                <MessageSquare size={48} className="mx-auto mb-4 text-slate-200" />
                <p className="text-lg font-medium text-slate-600">Select a staff member</p>
                <p className="text-sm mt-1">Choose a teacher from the list to start chatting</p>
              </div>
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
    </div>
  );
}
