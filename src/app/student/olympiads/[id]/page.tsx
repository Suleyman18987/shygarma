'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Clock, CheckCircle, XCircle, Loader2, Send } from 'lucide-react'

export default function OlympiadDetailPage() {
  const { id } = useParams()
  const { profile } = useAuth()
  const supabase = createClient()
  const [olympiad, setOlympiad] = useState<any>(null)
  const [problems, setProblems] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submissions, setSubmissions] = useState<Record<string, any>>({})
  const [currentIdx, setCurrentIdx] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState('')

  const handleRunCode = async (problemId: string) => {
    setRunning(true)
    try {
      const code = answers[problemId] || ''
      const res = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: 'python',
          version: '3.10.0',
          files: [{ name: 'main.py', content: code }]
        })
      })
      const data = await res.json()
      setRunResult(data.run?.output || data.message || 'Қате шықты')
    } catch (e) {
      setRunResult('Сервермен байланыс жоқ')
    }
    setRunning(false)
  }

  useEffect(() => {
    const load = async () => {
      const { data: o } = await supabase.from('olympiads').select('*').eq('id', id).single()
      setOlympiad(o)
      const { data: p } = await supabase.from('problems').select('*').eq('olympiad_id', id).order('order_index')
      setProblems(p || [])

      if (profile) {
        const { data: subs } = await supabase.from('olympiad_submissions').select('*').eq('student_id', profile.id)
        const subMap: Record<string, any> = {}
        subs?.forEach(s => { subMap[s.problem_id] = s })
        setSubmissions(subMap)
      }
    }
    load()
  }, [id, profile])

  const handleSubmit = async (problemId: string) => {
    if (!profile) return
    setSubmitting(true)
    const problem = problems.find(p => p.id === problemId)
    const answer = answers[problemId] || ''
    let score = 0
    let isCorrect: boolean | null = null

    if (problem.type === 'test' && problem.options) {
      const correctOpt = problem.options.find((o: any) => o.correct)
      isCorrect = correctOpt?.text === answer
      score = isCorrect ? problem.points : 0
    } else if (problem.type === 'short_answer') {
      isCorrect = answer.trim().toLowerCase() === (problem.correct_answer || '').trim().toLowerCase()
      score = isCorrect ? problem.points : 0
    } else if (problem.type === 'code') {
      const res = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: 'python',
          version: '3.10.0',
          files: [{ name: 'main.py', content: answer }]
        })
      })
      const respData = await res.json()
      const output = (respData.run?.output || '').trim()
      const expected = (problem.correct_answer || '').trim()
      isCorrect = output === expected
      score = isCorrect ? problem.points : 0
    } else {
      score = 0 // creative — teacher grades later
    }

    const { data } = await supabase.from('olympiad_submissions').insert({
      problem_id: problemId,
      student_id: profile.id,
      answer,
      score,
      is_correct: isCorrect,
    }).select().single()

    if (data) {
      setSubmissions(prev => ({ ...prev, [problemId]: data }))
      // Add XP
      if (score > 0) {
        await supabase.from('profiles').update({ xp: profile.xp + score }).eq('id', profile.id)
      }
    }
    setSubmitting(false)
  }

  if (!olympiad) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#4F46E5]" /></div>

  const current = problems[currentIdx]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0F172A] mb-1">{olympiad.title}</h1>
        <p className="text-sm text-[#64748B]">{olympiad.description}</p>
        {olympiad.end_time && (
          <div className="flex items-center gap-1.5 text-sm text-[#F59E0B] mt-2">
            <Clock className="w-4 h-4" />
            Аяқталу: {new Date(olympiad.end_time).toLocaleString('kk')}
          </div>
        )}
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Problem list */}
        <div className="lg:w-48 shrink-0">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-3 space-y-1">
            {problems.map((p, i) => {
              const sub = submissions[p.id]
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setCurrentIdx(i)
                    setRunResult('')
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl transition-colors ${
                    currentIdx === i ? 'bg-[#EEF2FF] text-[#4F46E5] font-medium' : 'text-[#64748B] hover:bg-[#F8FAFC]'
                  }`}
                >
                  {sub ? (
                    sub.is_correct === true ? <CheckCircle className="w-4 h-4 text-green-500" /> :
                    sub.is_correct === false ? <XCircle className="w-4 h-4 text-red-500" /> :
                    <CheckCircle className="w-4 h-4 text-blue-500" />
                  ) : <div className="w-4 h-4 rounded-full border-2 border-[#E2E8F0]" />}
                  Есеп {i + 1}
                </button>
              )
            })}
          </div>
        </div>

        {/* Problem detail */}
        {current && (
          <div className="flex-1 bg-white rounded-2xl border border-[#E2E8F0] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#0F172A]">{current.title}</h2>
              <span className="text-sm text-[#4F46E5] font-medium">{current.points} балл</span>
            </div>
            <p className="text-sm text-[#64748B] mb-6 whitespace-pre-wrap">{current.description}</p>

            {submissions[current.id] ? (
              <div className={`p-4 rounded-xl ${submissions[current.id].is_correct === true ? 'bg-green-50 border border-green-200' : submissions[current.id].is_correct === false ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
                <div className="text-sm font-medium mb-1">
                  {submissions[current.id].is_correct === true ? '✅ Дұрыс!' : submissions[current.id].is_correct === false ? '❌ Қате' : '📝 Жіберілді (мұғалім тексереді)'}
                </div>
                <div className="text-sm text-[#64748B]">Сіздің жауабыңыз: {submissions[current.id].answer}</div>
                <div className="text-sm font-medium mt-1">Балл: {submissions[current.id].score}/{current.points}</div>
              </div>
            ) : (
              <div>
                {current.type === 'test' && current.options ? (
                  <div className="space-y-2 mb-4">
                    {current.options.map((opt: any, i: number) => (
                      <label key={i} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${answers[current.id] === opt.text ? 'border-[#4F46E5] bg-[#EEF2FF]' : 'border-[#E2E8F0] hover:bg-[#F8FAFC]'}`}>
                        <input type="radio" name={`q_${current.id}`} value={opt.text} checked={answers[current.id] === opt.text} onChange={() => setAnswers(p => ({ ...p, [current.id]: opt.text }))} className="accent-[#4F46E5]" />
                        <span className="text-sm">{opt.text}</span>
                      </label>
                    ))}
                  </div>
                ) : current.type === 'short_answer' ? (
                  <input
                    type="text"
                    value={answers[current.id] || ''}
                    onChange={e => setAnswers(p => ({ ...p, [current.id]: e.target.value }))}
                    className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                    placeholder="Жауабыңызды жазыңыз..."
                  />
                ) : current.type === 'code' ? (
                  <div className="mb-4">
                    <p className="text-xs text-[#64748B] mb-2 font-medium">Код жазу (Python)</p>
                    <textarea
                      value={answers[current.id] || ''}
                      onChange={e => setAnswers(p => ({ ...p, [current.id]: e.target.value }))}
                      className="w-full px-4 py-3 bg-[#1E293B] text-green-400 font-mono border border-[#0F172A] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] min-h-[250px]"
                      placeholder="def solve():&#10;    # Кодыңызды осында жазыңыз&#10;    print('Hello World')&#10;&#10;solve()"
                    />
                    {runResult && (
                      <div className="mt-3 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-mono">
                        <div className="font-semibold text-[#64748B] mb-1">Орындау нәтижесі:</div>
                        <pre className="whitespace-pre-wrap">{runResult}</pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <textarea
                    value={answers[current.id] || ''}
                    onChange={e => setAnswers(p => ({ ...p, [current.id]: e.target.value }))}
                    className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] min-h-[120px]"
                    placeholder="Шығармашылық жауабыңызды жазыңыз..."
                  />
                )}
                
                <div className="flex gap-2">
                  {current.type === 'code' && (
                    <button
                      onClick={() => handleRunCode(current.id)}
                      disabled={running || !answers[current.id]}
                      className="flex items-center gap-2 px-6 py-2.5 bg-gray-800 hover:bg-gray-900 text-white font-medium text-sm rounded-xl disabled:opacity-50 transition-colors"
                    >
                      {running ? <Loader2 className="w-4 h-4 animate-spin" /> : '▶'} Run Code
                    </button>
                  )}
                  <button
                    onClick={() => handleSubmit(current.id)}
                    disabled={submitting || !answers[current.id]}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-medium text-sm rounded-xl disabled:opacity-50 transition-colors"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Жіберу
                  </button>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-6 pt-4 border-t border-[#E2E8F0]">
              <button onClick={() => { setCurrentIdx(Math.max(0, currentIdx - 1)); setRunResult('') }} disabled={currentIdx === 0} className="text-sm text-[#64748B] hover:text-[#0F172A] disabled:opacity-30">← Алдыңғы</button>
              <span className="text-sm text-[#94A3B8]">{currentIdx + 1} / {problems.length}</span>
              <button onClick={() => { setCurrentIdx(Math.min(problems.length - 1, currentIdx + 1)); setRunResult('') }} disabled={currentIdx === problems.length - 1} className="text-sm text-[#64748B] hover:text-[#0F172A] disabled:opacity-30">Келесі →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
