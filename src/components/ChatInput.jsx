import React, { useState, useRef } from 'react';
import { LuSend as Send, LuPaperclip as Paperclip, LuMic as Mic, LuSquare as Square, LuX as X, LuImage as Image, LuFile as FileIcon } from 'react-icons/lu';
import { uploadChatMedia } from '../firebase/firestore';
import toast from 'react-hot-toast';

export default function ChatInput({ schoolId, chatRoomId, onSendMessage }) {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaFile, setMediaFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File must be less than 5MB");
        return;
      }
      setMediaFile(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], 'voice_message.webm', { type: 'audio/webm' });
        setMediaFile(file);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      toast.error("Could not access microphone. Please ensure permissions are granted.");
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim() && !mediaFile) return;

    const textToSend = inputText.trim();
    setInputText('');
    
    if (mediaFile) {
      setUploading(true);
      try {
        const mediaUrl = await uploadChatMedia(schoolId, chatRoomId, mediaFile);
        let mediaType = 'document';
        if (mediaFile.type.includes('image')) mediaType = 'image';
        if (mediaFile.type.includes('audio') || mediaFile.name === 'voice_message.webm') mediaType = 'audio';
        
        await onSendMessage(textToSend, mediaUrl, mediaType);
        setMediaFile(null);
      } catch (err) {
        toast.error("Failed to upload media.");
      } finally {
        setUploading(false);
      }
    } else {
      await onSendMessage(textToSend, null, null);
    }
  };

  return (
    <div className="bg-white border-t border-slate-200">
      {/* Media Preview Area */}
      {mediaFile && (
        <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
              {mediaFile.type.includes('image') ? <Image size={20} /> : (mediaFile.type.includes('audio') || mediaFile.name === 'voice_message.webm') ? <Mic size={20} /> : <FileIcon size={20} />}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-700 truncate max-w-[200px] md:max-w-xs">{mediaFile.name}</p>
              <p className="text-xs text-slate-500">{(mediaFile.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => setMediaFile(null)}
            className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-3 md:p-4 flex items-end gap-2 bg-slate-50">
        
        {!isRecording ? (
          <>
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all shrink-0"
              title="Attach File"
            >
              <Paperclip size={22} />
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
                accept="image/*,.pdf,.doc,.docx"
              />
            </button>
            
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-slate-900/10 focus-within:border-slate-900 transition-all">
              <textarea 
                rows="1"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a message..."
                className="w-full max-h-32 px-4 py-3 bg-transparent border-none focus:ring-0 resize-none font-medium custom-scrollbar"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (inputText.trim() || mediaFile) handleSubmit(e);
                  }
                }}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-between bg-red-50 border border-red-100 rounded-2xl px-4 py-3 animate-pulse">
            <div className="flex items-center gap-3 text-red-600 font-bold">
              <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
              Recording... {formatTime(recordingTime)}
            </div>
            <button 
              type="button"
              onClick={stopRecording}
              className="p-1.5 bg-white text-red-600 rounded-lg shadow-sm hover:bg-red-50 border border-red-100"
            >
              <Square size={16} fill="currentColor" />
            </button>
          </div>
        )}

        {inputText.trim() || mediaFile ? (
          <button 
            type="submit"
            disabled={uploading}
            className={`p-3 rounded-xl shadow-sm shrink-0 transition-all ${
              uploading ? 'bg-slate-300 text-slate-500' : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            {uploading ? (
              <div className="w-6 h-6 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send size={22} className={inputText.trim() || mediaFile ? 'ml-1' : ''} />
            )}
          </button>
        ) : (
          !isRecording && (
            <button 
              type="button"
              onClick={startRecording}
              className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shrink-0"
              title="Voice Message"
            >
              <Mic size={22} />
            </button>
          )
        )}
      </form>
    </div>
  );
}
