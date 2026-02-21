import React, { useState, useRef, useEffect } from 'react';
import { Smile, PlusCircle, Send } from 'lucide-react';
import { emojiData, emojiCategories, commonEmojis } from '../constants/emojis';

// Debounce hook for typing indicator
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

interface MessageInputProps {
    onSendMessage: (text: string, file?: File) => Promise<boolean> | boolean;
    onTyping: () => void;
    disabled: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, onTyping, disabled }) => {
    const [newMessage, setNewMessage] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [emojiSearch, setEmojiSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('smileys');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);

    // Filter emojis based on search
    const filteredEmojis = emojiSearch
        ? Object.values(emojiData).flat().filter((emoji: string) => {
            // Very basic search simulation since emojiData is just strings
            // In a real app we'd map emoji names to search
            // For now, if searching, show nothing or just first 100 random ones?
            // Actually, standard emoji pickers search by NAME.
            // Since we only have the characters in the map, strict search is hard.
            // We'll just show all emojis if no search logic is implemented or keep existing behavior.
            return true;
        }).slice(0, 50)
        : emojiData[activeCategory];

    const handleEmojiSelect = (emoji: string) => {
        setNewMessage(prev => prev + emoji);
        setShowEmojiPicker(false);
        inputRef.current?.focus();
    };

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() && !selectedFile) return;

        const textToSend = newMessage;
        const fileToSend = selectedFile || undefined;
        const sent = await onSendMessage(textToSend, fileToSend);
        if (sent !== false) {
            setNewMessage('');
            setSelectedFile(null);
            setFilePreview(null);
            // Reset height
            if (inputRef.current) {
                inputRef.current.style.height = 'auto';
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void handleSend();
        }
    };

    // Broadcast typing on change
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNewMessage(e.target.value);
        onTyping();

        // Auto-resize
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validation: Image or PDF
            const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
            if (!validTypes.includes(file.type)) {
                alert('Please select an image or a PDF file.');
                return;
            }

            setSelectedFile(file);
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = () => setFilePreview(reader.result as string);
                reader.readAsDataURL(file);
            } else {
                setFilePreview(null); // No preview for PDF
            }
        }
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        setFilePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Close emoji picker on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        };

        if (showEmojiPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showEmojiPicker]);

    return (
        <div className="shrink-0 p-4 pt-2 pb-4 bg-white border-t border-stone-border relative">
            {/* Emoji Picker */}
            {showEmojiPicker && (
                <div ref={emojiPickerRef} className="absolute bottom-16 right-4 w-72 bg-white border border-stone-border rounded-lg shadow-xl z-50 overflow-hidden flex flex-col" style={{ height: '350px' }}>
                    {/* Categories */}
                    <div className="flex bg-stone-50 border-b border-stone-border overflow-x-auto scrollbar-hide">
                        {emojiCategories.map(cat => (
                            <button
                                key={cat.key}
                                onClick={() => setActiveCategory(cat.key)}
                                className={`flex-shrink-0 p-2 text-lg hover:bg-stone-off transition-colors ${activeCategory === cat.key ? 'bg-white border-b-2 border-sage' : ''}`}
                                title={cat.name}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Emoji Grid */}
                    <div className="flex-1 overflow-y-auto p-2">
                        <div className="grid grid-cols-6 gap-1">
                            {filteredEmojis.map((emoji, idx) => (
                                <button
                                    key={`${emoji}-${idx}`}
                                    onClick={() => handleEmojiSelect(emoji)}
                                    className="p-1 hover:bg-stone-off rounded text-xl"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* File Input (Hidden) */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,application/pdf"
                onChange={handleFileSelect}
            />

            {/* Pending Attachment Preview */}
            {selectedFile && (
                <div className="mb-2 p-2 bg-stone-off rounded-lg border border-stone-border flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200">
                    <div className="flex items-center gap-2 overflow-hidden">
                        {filePreview ? (
                            <img src={filePreview} alt="Preview" className="h-10 w-10 object-cover rounded border border-stone-border" />
                        ) : (
                            <div className="h-10 w-10 flex items-center justify-center bg-white rounded border border-stone-border">
                                <span className="material-symbols-outlined text-[20px] text-slate-400">description</span>
                            </div>
                        )}
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium text-slate-900 truncate">{selectedFile.name}</span>
                            <span className="text-xs text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                    </div>
                    <button
                        onClick={handleRemoveFile}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>
            )}

            {/* Input Area */}
            <div className="relative flex items-end gap-2 bg-white rounded-lg p-1.5 shadow-sm border border-stone-border focus-within:ring-2 focus-within:ring-sage focus-within:border-transparent transition-all">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 text-slate-500 hover:text-sage transition-colors rounded-lg h-8 w-8 flex items-center justify-center shrink-0"
                >
                    <PlusCircle className="text-[20px]" />
                </button>

                <textarea
                    ref={inputRef}
                    className="block w-full resize-none border-0 bg-transparent py-1.5 px-0 text-slate-900 placeholder:text-slate-500 focus:ring-0 sm:text-sm sm:leading-6"
                    placeholder="Type a message..."
                    rows={1}
                    style={{ minHeight: '32px', maxHeight: '120px' }}
                    value={newMessage}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                />

                <div className="flex items-center gap-1 shrink-0">
                    <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={`p-1.5 transition-colors rounded-lg h-8 w-8 flex items-center justify-center ${showEmojiPicker ? 'text-sage bg-stone-off' : 'text-slate-500 hover:text-sage'}`}
                    >
                        <Smile className="text-[18px]" />
                    </button>

                    {(newMessage.trim() || selectedFile) && (
                        <button
                            onClick={() => void handleSend()}
                            className="p-1.5 text-sage hover:text-sage-dark transition-colors rounded-lg h-8 w-8 flex items-center justify-center animate-in fade-in zoom-in duration-200"
                        >
                            <Send className="text-[18px]" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
