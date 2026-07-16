import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getStudentsByClass, subscribeToMessages, sendMessage, checkParentRegistration } from '../../firebase/firestore';
import { LuSend as Send, LuCircleUser as UserCircle, LuCircleAlert as AlertCircle, LuMessageSquare as MessageSquare } from 'react-icons/lu';
import toast from 'react-hot-toast';

export default function TeacherChat() {
  const { userProfile, currentUser } = useAuth();
  const schoolId = userProfile?.schoolId;
  const classId = userProfile?.assignedClassId;

  const [students, setStudents] = useState([]);
  const [activeStudent, setActiveStudent] = useState(null);
  const [linkedParentId, setLinkedParentId] = useState(null);
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(true);
  
  const messagesEndRef = useRef(null);

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
    }
  }, [schoolId, classId]);

  // Handle student selection and message subscription
  useEffect(() => {
    let unsubscribe = null;
    
    const setupChat = async () => {
      if (activeStudent && schoolId) {
        setMessages([]); // clear old messages
        
        // 1. Check if parent is registered
        try {
          const parentDoc = await checkParentRegistration(schoolId, activeStudent.id);
          setLinkedParentId(parentDoc ? parentDoc.id : null);
        } catch (error) {
          console.error("Permission error checking parent registration:", error);
          setLinkedParentId(null);
        }

        // 2. Subscribe to messages
        unsubscribe = subscribeToMessages(schoolId, activeStudent.id, (newMessages) => {
          setMessages(newMessages);
        });
      }
    };

    setupChat();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeStudent, schoolId]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeStudent || !schoolId) return;

    const textToSend = inputText.trim();
    setInputText('');

    try {
      await sendMessage(
        schoolId,
        activeStudent.id,
        currentUser.uid,
        linkedParentId,
        currentUser.uid,
        'teacher',
        textToSend
      );
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message.");
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
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-bold text-slate-700">Class Roster</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
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
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden">
          {activeStudent ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-4 shrink-0">
                <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-lg">
                  {activeStudent.firstName.charAt(0)}{activeStudent.lastName.charAt(0)}
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-lg">
                    {activeStudent.firstName} {activeStudent.lastName}'s Parent
                  </h2>
                  <p className="text-xs text-slate-500">
                    {linkedParentId ? 'Parent is registered' : 'Checking parent status...'}
                  </p>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 p-6 overflow-y-auto bg-slate-50/30 flex flex-col gap-4">
                {messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <MessageSquare size={48} className="mb-4 text-slate-200" />
                    <p>No messages yet. Send a message to start the conversation.</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.senderId === currentUser.uid;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-2xl p-4 ${
                          isMe 
                            ? 'bg-primary-600 text-white rounded-tr-none' 
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
                        }`}>
                          <p className="text-sm">{msg.text}</p>
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
              <div className="p-4 border-t border-slate-100 bg-white shrink-0">
                {linkedParentId === null ? (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3 text-amber-800">
                    <AlertCircle size={20} className="shrink-0" />
                    <p className="text-sm font-medium">This student's parent has not registered and linked their account yet. They will not receive these messages.</p>
                  </div>
                ) : null}
                
                <form 
                  onSubmit={handleSendMessage} 
                  className={`mt-2 flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border transition-colors focus-within:border-primary-500 ${linkedParentId === null ? 'opacity-50 pointer-events-none' : 'border-slate-200'}`}
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={linkedParentId ? "Type a message..." : "Waiting for parent registration..."}
                    disabled={linkedParentId === null}
                    className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-2 text-slate-700"
                  />
                  <button 
                    type="submit"
                    disabled={!inputText.trim() || linkedParentId === null}
                    className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:hover:bg-primary-600 shrink-0 shadow-sm"
                  >
                    <Send size={18} className="ml-1" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12 text-center">
              <UserCircle size={64} className="mb-4 text-slate-200" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">Select a Student</h3>
              <p>Choose a student from the roster to chat with their parent.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
