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
    onSendMessage: (text: string) => Promise<boolean> | boolean;
    onTyping: () => void;
    disabled: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, onTyping, disabled }) => {
    const [newMessage, setNewMessage] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [emojiSearch, setEmojiSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('smileys');
    const inputRef = useRef<HTMLTextAreaElement>(null);
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
        if (!newMessage.trim()) return;

        const textToSend = newMessage;
        const sent = await onSendMessage(textToSend);
        if (sent !== false) {
            setNewMessage('');
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

            {/* Input Area */}
            <div className="relative flex items-end gap-2 bg-white rounded-lg p-1.5 shadow-sm border border-stone-border focus-within:ring-2 focus-within:ring-sage focus-within:border-transparent transition-all">
                <button className="p-1.5 text-slate-500 hover:text-sage transition-colors rounded-lg h-8 w-8 flex items-center justify-center shrink-0">
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

                    {newMessage.trim() && (
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
