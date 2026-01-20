'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { sendMessage, getTeamMessages } from '@/app/actions/chat'

interface Message {
    id: string
    content: string
    user_email: string
    created_at: string
}

export default function TeamChat({ teamId, currentUserEmail }: { teamId: string, currentUserEmail: string }) {
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [supabase] = useState(() => createClient())

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        // Initial fetch
        const fetchMessages = async () => {
            const res = await getTeamMessages(teamId)
            if (res.success && res.data) {
                setMessages(res.data)
            } else if (!res.success) {
                console.error("Error fetching messages:", res.error)
            }
            setLoading(false)
        }
        fetchMessages()

        // Subscription
        const channel = supabase
            .channel(`team_chat:${teamId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'team_messages',
                filter: `team_id=eq.${teamId}`
            }, (payload) => {
                const newMsg = payload.new as Message
                setMessages(prev => {
                    // Avoid duplicates if optimistic update already added it
                    if (prev.some(m => m.id === newMsg.id)) return prev
                    return [...prev, newMsg]
                })
            })
            .subscribe((status) => {
                setIsRealtimeConnected(status === 'SUBSCRIBED')
                if (status !== 'SUBSCRIBED' && status !== 'CLOSED') {
                    console.error("Realtime subscription status:", status)
                }
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [teamId, supabase])

    useEffect(() => {
        scrollToBottom()
    }, [messages, loading])

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim()) return

        const content = newMessage
        setNewMessage('') 

        // Optimistic update
        const tempId = crypto.randomUUID()
        const optimisticMsg: Message = {
            id: tempId,
            content: content,
            user_email: currentUserEmail,
            created_at: new Date().toISOString()
        }
        setMessages(prev => [...prev, optimisticMsg])

        const result = await sendMessage(teamId, content)
        if (result.success && result.data) {
            // Replace optimistic message with real one
            setMessages(prev => prev.map(m => m.id === tempId ? (result.data as Message) : m))
        } else {
            // Error handling
            setMessages(prev => prev.filter(m => m.id !== tempId)) // Remove optimistic msg
            setNewMessage(content) // Restore input
            alert(`Error enviando mensaje: ${result.error}`)
        }
    }

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando chat...</div>

    return (
        <div className="flex flex-col h-[600px] bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-neutral-800 bg-neutral-900/50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-200">Chat de Equipo</h3>
                <div className="flex items-center gap-2" title={isRealtimeConnected ? "Conectado al chat en vivo" : "Desconectado del chat en vivo"}>
                    <span className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></span>
                    <span className="text-xs text-neutral-500 hidden sm:block">
                        {isRealtimeConnected ? 'En vivo' : 'Desconectado'}
                    </span>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-gray-500 mt-10">
                        <p>No hay mensajes aún.</p>
                        <p className="text-sm">¡Comienza la conversación con tu equipo!</p>
                    </div>
                )}
                {messages.map((msg) => {
                    const isMe = msg.user_email === currentUserEmail
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] rounded-lg p-3 ${
                                isMe 
                                    ? 'bg-indigo-600 text-white rounded-br-none' 
                                    : 'bg-neutral-800 text-gray-200 rounded-bl-none'
                            }`}>
                                {!isMe && (
                                    <div className="text-xs text-indigo-300 mb-1 font-medium">{msg.user_email.split('@')[0]}</div>
                                )}
                                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                                <div className={`text-[10px] mt-1 ${isMe ? 'text-indigo-200' : 'text-gray-500'} text-right`}>
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
            </div>
            
            <form onSubmit={handleSend} className="p-4 border-t border-neutral-800 bg-neutral-900 flex gap-3">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 bg-neutral-800 border border-neutral-700 text-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-500"
                />
                <button 
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                    <span>Enviar</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
                    </svg>
                </button>
            </form>
        </div>
    )
}
