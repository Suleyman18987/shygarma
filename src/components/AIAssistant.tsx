'use client'
import React, { useState, useRef, useEffect } from 'react'
import { Sparkles, X, Send, Loader2, ArrowLeft, MessageSquare, Trash2, Plus, History } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatSession {
  id: string
  title: string
  messages: Message[]
  updatedAt: number
}

function prepareContents(messagesList: Message[]) {
  // Gemini requires the conversation to start with 'user' role
  let startIndex = 0
  while (startIndex < messagesList.length && messagesList[startIndex].role !== 'user') {
    startIndex++
  }

  const filtered = messagesList.slice(startIndex)
  if (filtered.length === 0) {
    return []
  }

  // Gemini requires strictly alternating roles ('user' and 'model')
  const result: any[] = []
  for (const msg of filtered) {
    const role = msg.role === 'assistant' ? 'model' : 'user'
    
    if (result.length > 0 && result[result.length - 1].role === role) {
      // Merge consecutive messages of the same role
      result[result.length - 1].parts[0].text += '\n\n' + msg.content
    } else {
      result.push({
        role,
        parts: [{ text: msg.content }]
      })
    }
  }

  return result
}

function parseMarkdown(text: string, isUser: boolean = false) {
  const parts = text.split(/(```[\s\S]*?```)/g)

  return parts.map((part, index) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const content = part.slice(3, -3)
      const lines = content.split('\n')
      let code = content
      if (lines.length > 1 && /^[a-zA-Z0-9_-]+$/.test(lines[0].trim())) {
        code = lines.slice(1).join('\n')
      }
      return (
        <pre key={index} className={`p-3 rounded-xl font-mono text-xs overflow-x-auto my-2 border whitespace-pre ${
          isUser 
            ? 'bg-[#312E81] text-[#E0E7FF] border-[#4338CA]' 
            : 'bg-slate-50 text-[#0F172A] border-[#E2E8F0]'
        }`}>
          <code>{code.trim()}</code>
        </pre>
      )
    }

    const lines = part.split('\n')
    return (
      <div key={index} className="space-y-1">
        {lines.map((line, lineIdx) => {
          let trimmed = line.trim()
          if (trimmed === '') {
            return <div key={lineIdx} className="h-1.5" />
          }
          
          const isBullet = trimmed.startsWith('* ') || trimmed.startsWith('- ')
          const isNumbered = /^\d+\.\s/.test(trimmed)

          if (isBullet) {
            trimmed = trimmed.replace(/^[\*\-]\s+/, '')
          } else if (isNumbered) {
            trimmed = trimmed.replace(/^\d+\.\s+/, '')
          }

          const inlineParts = trimmed.split(/(`[^`]+`)/g)
          const formattedLine = inlineParts.map((subPart, subIdx) => {
            if (subPart.startsWith('`') && subPart.endsWith('`')) {
              return (
                <code key={subIdx} className={`px-1.5 py-0.5 rounded-md font-mono text-xs border ${
                  isUser 
                    ? 'bg-[#4338CA] text-white border-[#3730A3]' 
                    : 'bg-[#EEF2FF] text-[#4F46E5] border-[#E2E8F0]'
                }`}>
                  {subPart.slice(1, -1)}
                </code>
              )
            }

            const boldParts = subPart.split(/(\*\*[^*]+\*\*)/g)
            return boldParts.map((boldPart, boldIdx) => {
              if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
                return (
                  <strong key={boldIdx} className={`font-extrabold ${isUser ? 'text-white' : 'text-[#0F172A]'}`}>
                    {boldPart.slice(2, -2)}
                  </strong>
                )
              }
              return boldPart
            })
          })

          if (isBullet) {
            return (
              <ul key={lineIdx} className={`list-disc pl-5 my-0.5 text-xs sm:text-sm space-y-0.5 ${isUser ? 'text-white' : 'text-[#0F172A]'}`}>
                <li className="leading-relaxed">{formattedLine}</li>
              </ul>
            )
          }

          if (isNumbered) {
            const numMatch = line.match(/^(\d+)\.\s/)
            const num = numMatch ? numMatch[1] : '1'
            return (
              <ol key={lineIdx} className={`list-decimal pl-5 my-0.5 text-xs sm:text-sm space-y-0.5 ${isUser ? 'text-white' : 'text-[#0F172A]'}`} start={parseInt(num)}>
                <li className="leading-relaxed">{formattedLine}</li>
              </ol>
            )
          }

          return (
            <p key={lineIdx} className={`leading-relaxed text-xs sm:text-sm ${isUser ? 'text-white' : 'text-[#0F172A]'}`}>
              {formattedLine}
            </p>
          )
        })}
      </div>
    )
  })
}

const DEFAULT_GREETING = 'Сәлем! Мен DarynSpace AI ассистентімін. Мұғалімдер мен админдерге тапсырма құруға, жоба идеяларын ойлап табуға немесе оқушылардың үлгерімін талдауға көмектесемін. Не істей аламыз?'

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string>('')
  const [showSessionList, setShowSessionList] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load chat sessions from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('daryn_ai_sessions')
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ChatSession[]
        if (parsed.length > 0) {
          setSessions(parsed)
          setActiveSessionId(parsed[0].id)
          return
        }
      } catch (e) {
        console.error('Failed to parse saved chat sessions:', e)
      }
    }

    // Default first session
    const defaultSession: ChatSession = {
      id: 'default',
      title: 'Жаңа диалог',
      messages: [{ role: 'assistant', content: DEFAULT_GREETING }],
      updatedAt: Date.now()
    }
    setSessions([defaultSession])
    setActiveSessionId(defaultSession.id)
  }, [])

  // Save sessions to localStorage whenever they change
  const saveSessions = (updatedSessions: ChatSession[]) => {
    setSessions(updatedSessions)
    localStorage.setItem('daryn_ai_sessions', JSON.stringify(updatedSessions))
  }

  const activeSession = sessions.find(s => s.id === activeSessionId)
  const messages = activeSession ? activeSession.messages : []

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isOpen, showSessionList])

  const startNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'Жаңа диалог',
      messages: [{ role: 'assistant', content: DEFAULT_GREETING }],
      updatedAt: Date.now()
    }
    const updated = [newSession, ...sessions]
    saveSessions(updated)
    setActiveSessionId(newSession.id)
    setShowSessionList(false)
  }

  const deleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const filtered = sessions.filter(s => s.id !== id)
    
    if (filtered.length === 0) {
      const defaultSession: ChatSession = {
        id: 'default',
        title: 'Жаңа диалог',
        messages: [{ role: 'assistant', content: DEFAULT_GREETING }],
        updatedAt: Date.now()
      }
      saveSessions([defaultSession])
      setActiveSessionId(defaultSession.id)
    } else {
      saveSessions(filtered)
      if (activeSessionId === id) {
        setActiveSessionId(filtered[0].id)
      }
    }
  }

  const handleSend = async (textToSend?: string) => {
    const messageContent = (textToSend || input).trim()
    if (!messageContent || loading || !activeSessionId) return

    if (!textToSend) {
      setInput('')
    }

    const updatedMessages: Message[] = [...messages, { role: 'user', content: messageContent }]
    
    // Update active session locally
    let updatedSessions = sessions.map(s => {
      if (s.id === activeSessionId) {
        const isDefaultTitle = s.title === 'Жаңа диалог'
        return {
          ...s,
          title: isDefaultTitle ? (messageContent.length > 25 ? messageContent.substring(0, 25) + '...' : messageContent) : s.title,
          messages: updatedMessages,
          updatedAt: Date.now()
        }
      }
      return s
    })
    saveSessions(updatedSessions)
    setLoading(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages })
      })

      if (!response.ok) {
        // Fallback: Call Gemini API directly from browser using client-side fetch
        const clientApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
        
        if (!clientApiKey) {
          throw new Error('ИИ кілті теңшелінбеген (Сайтты қайта жинау қажет болуы мүмкін)')
        }

        const contents = prepareContents(updatedMessages)
        if (contents.length === 0) {
          throw new Error('Жіберілетін мәлімет табылмады')
        }

        const systemInstruction = 'Сен DarynSpace білім беру платформасының AI-ассистентісің. Жауаптарыңды қазақ тілінде бер. Мұғалімдерге және оқушыларға олимпиада және жоба жұмыстары бойынша көмектес. Қысқа және нақты жауап бер.'

        const clientResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${clientApiKey}`,
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
          const errData = await clientResponse.json().catch(() => ({}))
          const errMsg = errData.error?.message || clientResponse.statusText
          console.error('Gemini direct API error:', errData)
          throw new Error(`Сұраныс сәтсіз аяқталды: ${errMsg}`)
        }

        const data = await clientResponse.json()
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
        
        // Save reply
        const finalSessions = sessions.map(s => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: [...updatedMessages, { role: 'assistant' as const, content: aiText }],
              updatedAt: Date.now()
            }
          }
          return s
        })
        saveSessions(finalSessions)
      } else {
        const data = await response.json()
        
        const finalSessions = sessions.map(s => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: [...updatedMessages, { role: 'assistant' as const, content: data.response }],
              updatedAt: Date.now()
            }
          }
          return s
        })
        saveSessions(finalSessions)
      }
    } catch (error: any) {
      try {
        const clientApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
        
        if (!clientApiKey) {
          throw new Error('ИИ кілті теңшелінбеген')
        }

        const contents = prepareContents(updatedMessages)
        if (contents.length === 0) {
          throw new Error('Жіберілетін мәлімет табылмады')
        }

        const systemInstruction = 'Сен DarynSpace білім беру платформасының AI-ассистентісің. Жауаптарыңды қазақ тілінде бер.'

        const backupResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${clientApiKey}`,
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
          const errData = await backupResponse.json().catch(() => ({}))
          const errMsg = errData.error?.message || backupResponse.statusText
          console.error('Gemini fallback API error:', errData)
          throw new Error(`Сұраныс сәтсіз аяқталды: ${errMsg}`)
        }

        const data = await backupResponse.json()
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
        
        const finalSessions = sessions.map(s => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: [...updatedMessages, { role: 'assistant' as const, content: aiText }],
              updatedAt: Date.now()
            }
          }
          return s
        })
        saveSessions(finalSessions)
      } catch (innerError: any) {
        console.error('AI assistant component error:', error, innerError)
        const finalSessions = sessions.map(s => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: [...updatedMessages, { role: 'assistant' as const, content: `Қате орын алды: ${innerError.message || error.message || 'Сервер жауап бермеді.'}` }],
              updatedAt: Date.now()
            }
          }
          return s
        })
        saveSessions(finalSessions)
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
            {showSessionList ? (
              <button
                onClick={() => setShowSessionList(false)}
                className="p-1 hover:bg-white/50 rounded-lg text-[#64748B] hover:text-[#0F172A] transition-colors"
                title="Артқа қайту"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => setShowSessionList(true)}
                className="p-1 hover:bg-white/50 rounded-lg text-[#64748B] hover:text-[#0F172A] transition-colors flex items-center justify-center relative"
                title="Диалогтар тарихы"
              >
                <History className="w-5 h-5" />
              </button>
            )}
            
            <div className="flex items-center gap-1.5 ml-1">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center text-white">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#0F172A]">DarynSpace AI</h3>
                <p className="text-[10px] text-[#4F46E5] font-semibold">
                  {showSessionList ? 'Диалогтар тарихы' : 'Көмекші белсенді'}
                </p>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-[#F1F5F9] rounded-lg text-[#64748B] hover:text-[#0F172A] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {showSessionList ? (
          /* Session List View */
          <div className="flex-1 flex flex-col bg-[#F8FAFC]">
            <div className="p-4">
              <button
                onClick={startNewChat}
                className="w-full py-3 bg-white hover:bg-[#EEF2FF] text-[#4F46E5] border border-dashed border-[#4F46E5] rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Жаңа диалог бастау
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2.5">
              {sessions.map(s => {
                const isActive = s.id === activeSessionId
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setActiveSessionId(s.id)
                      setShowSessionList(false)
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${
                      isActive 
                        ? 'bg-[#EEF2FF] border-[#818CF8] shadow-sm' 
                        : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <MessageSquare className={`w-4 h-4 ${isActive ? 'text-[#4F46E5]' : 'text-[#94A3B8]'}`} />
                      <div className="truncate text-sm font-medium text-[#0F172A]">
                        {s.title}
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => deleteChat(s.id, e)}
                      className="p-1.5 text-[#94A3B8] hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
                      title="Диалогты өшіру"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* Chat Conversation View */
          <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-white to-[#F8FAFC]">
            {/* Quick Actions */}
            <div className="p-3 border-b border-[#E2E8F0] bg-[#F8FAFC] flex gap-2 overflow-x-auto scrollbar-none">
              <button
                onClick={() => handleQuickAction('task')}
                className="shrink-0 px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#4F46E5] hover:bg-[#EEF2FF] transition-colors"
              >
                📝 Тапсырма жасау
              </button>
              <button
                onClick={() => handleQuickAction('project')}
                className="shrink-0 px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#7C3AED] hover:bg-[#F5F3FF] transition-colors"
              >
                💡 Жоба идеясы
              </button>
              <button
                onClick={() => handleQuickAction('progress')}
                className="shrink-0 px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
              >
                📊 Прогресс талдау
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm ${
                      m.role === 'user'
                        ? 'bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white rounded-tr-none shadow-md shadow-[#4F46E5]/15'
                        : 'bg-white border border-[#E2E8F0] text-[#0F172A] rounded-tl-none'
                    }`}
                  >
                    {parseMarkdown(m.content, m.role === 'user')}
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
                className="flex-1 px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] resize-none max-h-24 min-h-[40px] text-[#0F172A] placeholder:text-[#94A3B8]"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-10 h-10 shrink-0 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl flex items-center justify-center disabled:opacity-50 transition-colors shadow-lg shadow-[#4F46E5]/10"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </aside>
    </>
  )
}
