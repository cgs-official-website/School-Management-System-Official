import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getStudentsByClass, subscribeToMessages, sendMessage, checkParentRegistration, deleteChatMessage, updateChatRoomStatus, subscribeToChatRoom, getChatsForTeacher } from '../../firebase/firestore';
import { LuMessageSquare as MessageSquare, LuFile as FileIcon, LuTrash2 as Trash2, LuCircleCheck as CheckCircle, LuClock as Clock, LuDownload as DownloadIcon } from 'react-icons/lu';
import toast from 'react-hot-toast';
import ChatInput from '../../components/ChatInput';
import CustomAudioPlayer from '../../components/CustomAudioPlayer';
import ConfirmModal from '../../components/ConfirmModal';
import * as XLSX from 'xlsx';

export default function TeacherChat() {
  const { userProfile, currentUser } = useAuth();
  const schoolId = userProfile?.schoolId;
  const classId = userProfile?.assignedClassId;

  const [students, setStudents] = useState([]);
  const [activeStudent, setActiveStudent] = useState(null);
  const [showClassSelector, setShowClassSelector] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [parentLinked, setParentLinked] = useState(null); // null = checking, true = linked, false = not linked
  const messagesEndRef = useRef(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: null, message: '' });

  const [linkedParentId, setLinkedParentId] = useState(null);
  const [parentName, setParentName] = useState('');
  const [chatRoomData, setChatRoomData] = useState(null);
  
  const [loadingStudents, setLoadingStudents] = useState(true);
  
  // Fetch students initially
  useEffect(() => {
    if (schoolId && classId) {
      getStudentsByClass(schoolId, classId)
        .then(data => {
          data.sort((a, b) => a.firstName.localeCompare(b.firstName));
          setStudents(data);
        })
        .catch(console.error)
        .finally(() => setLoadingStudents(false));
    } else {
      setLoadingStudents(false);
    }
  }, [schoolId, classId]);

  // Handle student selection and message subscription
  useEffect(() => {
    let unsubscribe = null;
    let unsubscribeRoom = null;
    
    const setupChat = async () => {
      if (activeStudent && schoolId) {
        setMessages([]); // clear old messages
        setParentName('');
        setChatRoomData(null);
        
        // 1. Check if parent is registered
        try {
          const parentDoc = await checkParentRegistration(schoolId, activeStudent.id);
          if (parentDoc) {
            setLinkedParentId(parentDoc.id);
            setParentName(parentDoc.name || `${parentDoc.firstName || ''} ${parentDoc.lastName || ''}`.trim() || 'Parent');
          } else {
            setLinkedParentId(null);
            setParentName('');
          }
        } catch (error) {
          console.error("Permission error checking parent registration:", error);
          setLinkedParentId(null);
          setParentName('');
        }

        // 2. Subscribe to messages using new room format (studentId_teacherId)
        unsubscribe = subscribeToMessages(schoolId, activeStudent.id, currentUser.uid, (newMessages) => {
          setMessages(newMessages);
        });

        // 3. Subscribe to chat room metadata
        unsubscribeRoom = subscribeToChatRoom(schoolId, activeStudent.id, currentUser.uid, (roomData) => {
          setChatRoomData(roomData);
        });
      }
    };

    setupChat();

    return () => {
      if (unsubscribe) unsubscribe();
      if (unsubscribeRoom) unsubscribeRoom();
    };
  }, [activeStudent, schoolId, currentUser.uid]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (text, mediaUrl, mediaType) => {
    if (!activeStudent || !schoolId) return;

    try {
      await sendMessage(
        schoolId,
        activeStudent.id,
        currentUser.uid,
        linkedParentId,
        currentUser.uid,
        'teacher',
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
          await deleteChatMessage(schoolId, `${activeStudent.id}_${currentUser.uid}`, msgId);
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

  const handleDownloadExcel = async () => {
    try {
      const toastId = toast.loading('Generating Excel sheet...');
      // Fetch all chats for this teacher
      const chats = await getChatsForTeacher(schoolId, currentUser.uid);
      const chatsMap = new Map();
      chats.forEach(c => chatsMap.set(c.studentId, c));

      // Construct rows based on roster
      const data = students.map(student => {
        const chatInfo = chatsMap.get(student.id);
        return {
          "Student ID": student.id,
          "Student Name": `${student.firstName} ${student.lastName}`,
          "Parent Name": chatInfo?.parentName || 'Unknown',
          "Chat Status": chatInfo?.status === 'completed' ? 'Completed' : 'Active',
          "Last Activity": chatInfo?.lastMessageTime ? new Date(chatInfo.lastMessageTime).toLocaleString() : 'N/A'
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Parent Chat Status");
      
      // Auto-size columns
      const cols = [{ wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 20 }];
      worksheet['!cols'] = cols;

      XLSX.writeFile(workbook, `Parent_Chats_Status_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.dismiss(toastId);
      toast.success('Excel sheet downloaded successfully!');
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast.error('Failed to download Excel sheet');
    }
  };

  if (loadingStudents) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto pb-24 h-[calc(100vh-2rem)] flex flex-col">
      <div className="mb-6 shrink-0">
        <h1 className="text-3xl font-bold text-slate-900">Parent Messaging</h1>
        <p className="text-slate-500 mt-1">Communicate directly with parents of your students.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* Sidebar - Roster List */}
        <div className="w-full lg:w-80 flex flex-col bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm shrink-0">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h2 className="font-bold text-slate-700">Class Roster</h2>
            <button 
              onClick={handleDownloadExcel}
              title="Download Live Sheet"
              className="p-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors"
            >
              <DownloadIcon size={18} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {students.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">No students in your class.</div>
            ) : (
              students.map(student => (
                <button
                  key={student.id}
                  onClick={() => setActiveStudent(student)}
                  className={`w-full text-left p-3 rounded-2xl flex items-center gap-3 transition-colors ${
                    activeStudent?.id === student.id 
                      ? 'bg-primary-50 border border-primary-200' 
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    activeStudent?.id === student.id ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-bold text-slate-900 truncate">
                      {student.firstName} {student.lastName}
                    </div>
                    <div className="text-xs text-slate-500 truncate">Parent Chat</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden relative">
          {activeStudent ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-lg">
                    {activeStudent.firstName.charAt(0)}{activeStudent.lastName.charAt(0)}
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-lg">
                      {parentName ? `Parent: ${parentName}` : `${activeStudent.firstName} ${activeStudent.lastName}`}
                    </h2>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      {linkedParentId ? (
                        <><span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span> Student: {activeStudent.firstName} {activeStudent.lastName}</>
                      ) : (
                        <><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> Parent Not Registered</>
                      )}
                    </p>
                  </div>
                </div>
                
                {linkedParentId && (
                  <button
                    onClick={() => {
                      const newStatus = chatRoomData?.status === 'completed' ? 'active' : 'completed';
                      updateChatRoomStatus(schoolId, activeStudent.id, currentUser.uid, newStatus);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                      chatRoomData?.status === 'completed'
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {chatRoomData?.status === 'completed' ? (
                      <><CheckCircle size={16} /> Completed</>
                    ) : (
                      <><Clock size={16} /> Mark Completed</>
                    )}
                  </button>
                )}
              </div>

              {/* Messages Area */}
              <div className="flex-1 p-4 md:p-6 overflow-y-auto custom-scrollbar bg-slate-50/30 flex flex-col gap-4">
                {messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center">
                    <MessageSquare size={48} className="mb-4 text-slate-200" />
                    <p>No messages yet.</p>
                    <p className="text-sm">Send a message to start the conversation.</p>
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
                chatRoomId={`${activeStudent.id}_${currentUser.uid}`} 
                onSendMessage={handleSendMessage} 
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-center p-8 bg-slate-50/50">
              <div>
                <MessageSquare size={48} className="mx-auto mb-4 text-slate-200" />
                <p className="text-lg font-medium text-slate-600">Select a student</p>
                <p className="text-sm mt-1">Choose a student from the roster to message their parents</p>
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
