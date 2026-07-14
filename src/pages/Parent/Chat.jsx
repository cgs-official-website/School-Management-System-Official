import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { subscribeToMessages, sendMessage } from '../../firebase/firestore';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { LuSend as Send, LuMessageSquare as MessageSquare } from 'react-icons/lu';
import toast from 'react-hot-toast';

export default function ParentChat() {
  const { userProfile, currentUser } = useAuth();
  const schoolId = userProfile?.schoolId;
  const studentId = userProfile?.linkedStudentId;
  const classId = userProfile?.linkedClassId;

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [teacherName, setTeacherName] = useState('Class Teacher');
  const [teacherId, setTeacherId] = useState(null);
  
  const messagesEndRef = useRef(null);

  // Fetch Class Teacher details
  useEffect(() => {
    const fetchTeacher = async () => {
      if (schoolId && classId) {
        // Find teacher assigned to this class
        const classDoc = await getDoc(doc(db, `schools/${schoolId}/classes`, classId));
        if (classDoc.exists()) {
          // In a real app we'd query the staff collection where assignedClassId == classId
          // For MVP, if teacher ID is stored on the class, use that.
          // Since we stored the class assignment in the teacher's profile during Mod 2.3, 
          // we should ideally query the staff collection.
          // For now, let's keep it abstract if we can't find it easily.
        }
      }
    };
    fetchTeacher();
  }, [schoolId, classId]);

  // Subscribe to messages
  useEffect(() => {
    let unsubscribe = null;
    
    if (schoolId && studentId) {
      unsubscribe = subscribeToMessages(schoolId, studentId, (newMessages) => {
        setMessages(newMessages);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [schoolId, studentId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !schoolId || !studentId) return;

    const textToSend = inputText.trim();
    setInputText('');

    try {
      await sendMessage(
        schoolId,
        studentId,
        teacherId || 'unknown_teacher', // the teacher will reply and bind their ID if not known
        currentUser.uid,
        currentUser.uid,
        'parent',
        textToSend
      );
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message.");
    }
  };

  if (!studentId) {
    return <div className="p-8 text-center text-slate-500">Please link a student to use the chat.</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
      <div className="mb-6 shrink-0">
        <h1 className="text-3xl font-bold text-slate-900">Teacher Chat</h1>
        <p className="text-slate-500 mt-1">Communicate directly with your child's class teacher.</p>
      </div>

      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden">
        
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-lg">
            T
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-lg">
              Class Teacher
            </h2>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span> Online
            </p>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-slate-50/30 flex flex-col gap-4">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center">
              <MessageSquare size={48} className="mb-4 text-slate-200" />
              <p>No messages yet.</p>
              <p className="text-sm">Say hello to the teacher to start the conversation.</p>
            </div>
          ) : (
            messages.map(msg => {
              const isMe = msg.senderId === currentUser.uid;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 ${
                    isMe 
                      ? 'bg-primary-600 text-white rounded-tr-none' 
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
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

        {/* Input Area (Disabled - Read Only Mode) */}
        <div className="p-4 border-t border-slate-100 bg-slate-100 shrink-0 text-center">
          <p className="text-sm font-semibold text-slate-500">
            This channel is restricted to Read-Only mode.
          </p>
        </div>
      </div>
    </div>
  );
}
