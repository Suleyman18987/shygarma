'use client'
import React, { useState, useRef, useEffect } from 'react'
import { Sparkles, X, Send, Loader2 } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Сәлем! Мен DarynSpace AI ассистентімін. Мұғалімдер мен админдерге тапсырма құруға, жоба идеяларын ойлап табуға немесе оқушылардың үлгерімін талдауға көмектесемін. Не істей аламыз?'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (textToSend?: string) => {
    const messageContent = (textToSend || input).trim()
    if (!messageContent || loading) return

    if (!textToSend) {
      setInput('')
    }

    const newMessages: Message[] = [...messages, { role: 'user', content: messageContent }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      })

      if (!response.ok) {
        // Fallback: Call Gemini API directly from browser using client-side fetch
        const clientApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
        
        if (!clientApiKey) {
          throw new Error('ИИ кілті теңшелінбеген')
        }

        const contents = newMessages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }))
        const systemInstruction = 'Сен DarynSpace білім беру платформасының AI-ассистентісің. Жауаптарыңды қазақ тілінде бер. Мұғалімдерге және оқушыларға олимпиада және жоба жұмыстары бойынша көмектес. Қысқа және нақты жауап бер.'

        const clientResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${clientApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              systemInstruction: {
                parts: [{ text: systemInstruction }]
              }
            })
          }
        )

        if (!clientResponse.ok) {
          throw new Error('Сұранысты орындау мүмкін болмады (Сервер және клиент шектеулі)')
        }

        const data = await clientResponse.json()
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
        setMessages((prev) => [...prev, { role: 'assistant', content: aiText }])
      } else {
        const data = await response.json()
        setMessages((prev) => [...prev, { role: 'assistant', content: data.response }])
      }
    } catch (error: any) {
      try {
        const clientApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
        
        if (!clientApiKey) {
          throw new Error('ИИ кілті теңшелінбеген')
        }

        const contents = newMessages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }))
        const systemInstruction = 'Сен DarynSpace білім беру платформасының AI-ассистентісің. Жауаптарыңды қазақ тілінде бер.'

        const backupResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${clientApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              systemInstruction: {
                parts: [{ text: systemInstruction }]
              }
            })
          }
        )

        if (!backupResponse.ok) {
          throw new Error('Сұраныс қабылданбады')
        }

        const data = await backupResponse.json()
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
        setMessages((prev) => [...prev, { role: 'assistant', content: aiText }])
      } catch (innerError) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Қате орын алды: ${error.message || 'Сервер жауап бермеді.'}` }
        ])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleQuickAction = (actionType: 'task' | 'project' | 'progress') => {
    let promptText = ''
    if (actionType === 'task') {
      promptText = 'Маған 8-сынып математикасынан «Квадрат теңдеулер» тақырыбына орташа қиындықтағы бір тапсырма (сұрақ, нұсқалар және жауабы) генерациялап берші.'
    } else if (actionType === 'project') {
      promptText = 'Оқушыларға арналған «Жасанды Интеллектті білім беруде қолдану» тақырыбындағы жоба жарысына идеялар мен талаптар ұсыншы.'
    } else if (actionType === 'progress') {
      promptText = 'Оқушының Creative Score көрсеткіші 85, бірақ олимпиадалық баллдары төмен. Оның дамуы мен оқу бағдарламасын жақсарту үшін қандай ұсыныстар бересіз?'
    }
    handleSend(promptText)
  }

  return (
    <>
      {/* Floating Sparkles Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] hover:from-[#4338CA] hover:to-[#6D28D9] text-white rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 group"
        title="AI Assistant"
      >
        <Sparkles className="w-6 h-6 animate-pulse group-hover:scale-110 transition-transform" />
      </button>

      {/* Sliding Backdrop blur */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white/95 backdrop-blur-md shadow-2xl border-l border-[#E2E8F0] z-50 flex flex-col transition-transform duration-300 ease-out transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-gradient-to-r from-[#EEF2FF] to-[#F5F3FF]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#0F172A]">DarynSpace AI</h3>
              <p className="text-[10px] text-[#4F46E5] font-medium">Көмекші белсенді</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-[#F1F5F9] rounded-lg text-[#64748B] hover:text-[#0F172A] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="p-3 border-b border-[#E2E8F0] bg-[#F8FAFC] flex gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => handleQuickAction('task')}
            className="shrink-0 px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#4F46E5] hover:bg-[#EEF2FF] transition-colors"
          >
            📝 Тапсырма жасау
          </button>
          <button
            onClick={() => handleQuickAction('project')}
            className="shrink-0 px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#7C3AED] hover:bg-[#F5F3FF] transition-colors"
          >
            💡 Жоба идеясы
          </button>
          <button
            onClick={() => handleQuickAction('progress')}
            className="shrink-0 px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
          >
            📊 Прогресс талдау
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-white to-[#F8FAFC]">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white rounded-tr-none shadow-md shadow-[#4F46E5]/15'
                    : 'bg-white border border-[#E2E8F0] text-[#0F172A] rounded-tl-none shadow-sm'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-[#E2E8F0] rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm flex items-center gap-1.5">
                <Loader2 className="w-4 h-4 animate-spin text-[#4F46E5]" />
                <span className="text-xs text-[#64748B]">Жауап дайындалуда...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="p-4 border-t border-[#E2E8F0] bg-white flex gap-2 items-center"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Сұрағыңызды жазыңыз..."
            rows={1}
            className="flex-1 px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] resize-none max-h-24 min-h-[40px] text-[#0F172A]"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-10 h-10 shrink-0 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl flex items-center justify-center disabled:opacity-50 transition-colors shadow-lg shadow-[#4F46E5]/10"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </aside>
    </>
  )
}
