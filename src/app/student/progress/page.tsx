'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { BarChart3, Target, Award } from 'lucide-react'

export default function StudentProgressPage() {
  const { profile, refreshProfile } = useAuth()
  const [supabase] = useState(() => createClient())
  const [badges, setBadges] = useState<any[]>([])
  const [stats, setStats] = useState({ olympiadSubs: 0, assignmentSubs: 0, projectSubs: 0, correctAnswers: 0 })
  const [certificates, setCertificates] = useState<any[]>([])
  const [selectedCert, setSelectedCert] = useState<any | null>(null)

  useEffect(() => {
    refreshProfile()
  }, [])

  useEffect(() => {
    const load = async () => {
      if (!profile) return
      
      // Load badges, counts
      const [ub, os, as2, ps, olySubs, projSubs] = await Promise.all([
        supabase.from('user_badges').select('*, badges(*)').eq('user_id', profile.id),
        supabase.from('olympiad_submissions').select('id, is_correct', { count: 'exact' }).eq('student_id', profile.id),
        supabase.from('assignment_submissions').select('id', { count: 'exact' }).eq('student_id', profile.id),
        supabase.from('project_submissions').select('id', { count: 'exact' }).eq('student_id', profile.id),
        supabase.from('olympiad_submissions').select('*, problems(*, olympiads(*))').eq('student_id', profile.id),
        supabase.from('project_submissions').select('*, projects(*)').eq('student_id', profile.id)
      ])
      
      setBadges(ub.data || [])
      
      const correct = (os.data || []).filter((s: any) => s.is_correct === true).length
      setStats({ 
        olympiadSubs: os.count || 0, 
        assignmentSubs: as2.count || 0, 
        projectSubs: ps.count || 0, 
        correctAnswers: correct 
      })

      // Aggregate Olympiad submissions by olympiad_id
      const olyGroups: Record<string, { title: string; score: number; maxScore: number; date: string }> = {}
      olySubs.data?.forEach((sub: any) => {
        const prob = sub.problems
        if (!prob || !prob.olympiads) return
        const oly = prob.olympiads
        if (!olyGroups[oly.id]) {
          olyGroups[oly.id] = {
            title: oly.title,
            score: 0,
            maxScore: 0,
            date: new Date(sub.submitted_at).toLocaleDateString('kk')
          }
        }
        olyGroups[oly.id].score += sub.score || 0
        olyGroups[oly.id].maxScore += prob.points || 0
      })

      const certsList: any[] = []

      // Generate Olympiad certificates if total score >= 50%
      Object.entries(olyGroups).forEach(([olyId, info]) => {
        if (info.maxScore === 0) return
        const pct = (info.score / info.maxScore) * 100
        if (pct >= 50) {
          let type = 'Қатысушы Сертификаты'
          let medal = '📜'
          if (pct >= 90) {
            type = 'I дәрежелі Диплом'
            medal = '🥇'
          } else if (pct >= 80) {
            type = 'II дәрежелі Диплом'
            medal = '🥈'
          } else if (pct >= 70) {
            type = 'III дәрежелі Диплом'
            medal = '🥉'
          }

          certsList.push({
            id: `oly_${olyId.substring(0, 8)}`,
            title: info.title,
            type: type,
            score: `${info.score} / ${info.maxScore} ұпай`,
            date: info.date,
            medal: medal,
            percentage: pct
          })
        }
      })

      // Generate Project certificates if graded and >= 50% (total_score >= 25 out of 50)
      projSubs.data?.forEach((sub: any) => {
        const proj = sub.projects
        if (!proj || sub.total_score === null) return
        const pct = (sub.total_score / 50) * 100
        if (pct >= 50) {
          let type = 'Қатысушы Сертификаты'
          let medal = '📜'
          if (pct >= 90) {
            type = 'I дәрежелі Диплом'
            medal = '🥇'
          } else if (pct >= 80) {
            type = 'II дәрежелі Диплом'
            medal = '🥈'
          } else if (pct >= 70) {
            type = 'III дәрежелі Диплом'
            medal = '🥉'
          }

          certsList.push({
            id: `proj_${sub.id.substring(0, 8)}`,
            title: proj.title,
            type: type,
            score: `${sub.total_score} / 50 балл`,
            date: new Date(sub.submitted_at || Date.now()).toLocaleDateString('kk'),
            medal: medal,
            percentage: pct
          })
        }
      })

      setCertificates(certsList)
    }
    load()
  }, [profile])

  const handlePrint = () => {
    const printContent = document.getElementById('certificate-print-area')
    if (!printContent) return
    
    const uniqueName = new Date().getTime()
    const windowName = 'Print' + uniqueName
    const printWindow = window.open('about:blank', windowName, 'left=50,top=50,width=850,height=600')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>DarynSpace Certificate</title>
            <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Playfair+Display:wght@700&family=Montserrat:wght@400;600&display=swap" rel="stylesheet">
            <style>
              body {
                margin: 0;
                padding: 20px;
                font-family: 'Montserrat', sans-serif;
                background-color: #ffffff;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 95vh;
              }
              .cert-card {
                width: 790px;
                height: 550px;
                padding: 40px;
                background-color: #fcfbf7;
                border: 16px double #d97706;
                position: relative;
                box-sizing: border-box;
                text-align: center;
                background-image: radial-gradient(circle, #ffffff 60%, #fcfbf7 100%);
              }
              .cert-title {
                font-family: 'Cinzel', serif;
                font-size: 42px;
                font-weight: 700;
                color: #b45309;
                margin-top: 15px;
                margin-bottom: 5px;
                letter-spacing: 4px;
              }
              .cert-subtitle {
                font-size: 11px;
                letter-spacing: 2px;
                color: #64748b;
                text-transform: uppercase;
                margin-bottom: 30px;
              }
              .cert-recipient-label {
                font-size: 14px;
                color: #475569;
                font-style: italic;
                margin-bottom: 10px;
              }
              .cert-recipient-name {
                font-family: 'Playfair Display', serif;
                font-size: 32px;
                font-weight: 700;
                color: #0f172a;
                border-bottom: 2px solid #e2e8f0;
                display: inline-block;
                padding-bottom: 5px;
                margin-bottom: 25px;
                min-width: 320px;
              }
              .cert-text {
                font-size: 14px;
                line-height: 1.6;
                color: #334155;
                margin: 0 auto 25px auto;
                max-width: 580px;
              }
              .cert-award {
                font-family: 'Cinzel', serif;
                font-size: 22px;
                font-weight: 700;
                color: #d97706;
                margin-bottom: 35px;
              }
              .cert-footer {
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                position: absolute;
                bottom: 40px;
                left: 50px;
                right: 50px;
              }
              .cert-sig {
                border-top: 1px solid #cbd5e1;
                padding-top: 5px;
                width: 180px;
                font-size: 11px;
                color: #64748b;
              }
              .cert-seal {
                width: 80px;
                height: 80px;
                border: 4px dashed #d97706;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 9px;
                font-weight: 700;
                color: #d97706;
                text-transform: uppercase;
                background-color: #fef3c7;
                letter-spacing: 1px;
                line-height: 1.2;
              }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  if (!profile) return null

  const csPercent = Math.min(profile.creative_score, 100)
  const progressItems = [
    { label: 'Олимпиада жауаптары', value: stats.olympiadSubs, color: '#4F46E5' },
    { label: 'Дұрыс жауаптар', value: stats.correctAnswers, color: '#10B981' },
    { label: 'Тапсырмалар', value: stats.assignmentSubs, color: '#F59E0B' },
    { label: 'Жобалар', value: stats.projectSubs, color: '#7C3AED' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0F172A] mb-6">Менің прогресім 📈</h1>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Creative Score */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
          <h2 className="font-semibold text-[#0F172A] mb-4 flex items-center gap-2"><Target className="w-5 h-5 text-[#7C3AED]" /> Creative Score</h2>
          <div className="flex items-center justify-center">
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#E2E8F0" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="url(#csGrad)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${csPercent * 2.64} 264`} />
                <defs><linearGradient id="csGrad"><stop stopColor="#4F46E5" /><stop offset="1" stopColor="#7C3AED" /></linearGradient></defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-[#0F172A]">{Math.round(csPercent)}</span>
                <span className="text-xs text-[#64748B]">/ 100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
          <h2 className="font-semibold text-[#0F172A] mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-[#4F46E5]" /> Статистика</h2>
          <div className="space-y-4">
            {progressItems.map((p, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#64748B]">{p.label}</span>
                  <span className="font-semibold" style={{ color: p.color }}>{p.value}</span>
                </div>
                <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ backgroundColor: p.color, width: `${Math.min(p.value * 10, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* XP & Level */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 mb-6">
        <h2 className="font-semibold text-[#0F172A] mb-3">XP & Level</h2>
        <div className="flex items-center gap-6">
          <div className="text-center"><div className="text-3xl font-bold text-[#4F46E5]">{profile.xp}</div><div className="text-xs text-[#64748B]">Жалпы XP</div></div>
          <div className="text-center"><div className="text-3xl font-bold text-[#0F172A]">{profile.level}</div><div className="text-xs text-[#64748B]">Level</div></div>
          <div className="flex-1">
            <div className="text-xs text-[#64748B] mb-1">Келесі деңгейге: {100 - (profile.xp % 100)} XP</div>
            <div className="h-3 bg-[#E2E8F0] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] rounded-full" style={{ width: `${profile.xp % 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Certificates & Diplomas */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 mb-6">
        <h2 className="font-semibold text-[#0F172A] mb-4 flex items-center gap-2"><Award className="w-5 h-5 text-amber-500" /> Менің марапаттарым 🏆</h2>
        {certificates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {certificates.map(c => (
              <div key={c.id} className="bg-gradient-to-r from-[#FCFBF7] to-[#F8F6F0] border border-amber-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{c.medal}</div>
                  <div>
                    <h3 className="font-bold text-sm text-[#0F172A]">{c.title}</h3>
                    <p className="text-xs text-amber-700 font-semibold">{c.type}</p>
                    <p className="text-[10px] text-[#94A3B8]">Нәтижесі: {c.score} • {c.date}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCert(c)}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-semibold rounded-lg shadow transition-colors cursor-pointer"
                >
                  Көру / PDF жүктеу
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#94A3B8] text-center py-4">Әлі марапаттар жоқ. Олимпиадалар мен жобаларда жоғары ұпай жинап (70%+ немесе 35+ балл), дипломдар алыңыз!</p>
        )}
      </div>

      {/* Badges */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
        <h2 className="font-semibold text-[#0F172A] mb-4">Бейдждер 🏅</h2>
        {badges.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {badges.map(ub => (
              <div key={ub.id} className="bg-[#F8FAFC] rounded-xl p-3 text-center">
                <div className="text-2xl mb-1">{ub.badges?.icon || '🏅'}</div>
                <div className="text-sm font-medium text-[#0F172A]">{ub.badges?.name}</div>
                <div className="text-xs text-[#94A3B8]">{ub.badges?.description}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#94A3B8] text-center py-4">Әлі бейдждер жоқ. Тапсырмалар орындап жинаңыз!</p>
        )}
      </div>

      {/* Certificate Modal */}
      {selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-[#E2E8F0] flex flex-col items-center">
            
            <style dangerouslySetInnerHTML={{ __html: `
              .cert-card {
                width: 100%;
                max-width: 600px;
                height: 420px;
                padding: 30px;
                background-color: #fcfbf7;
                border: 12px double #d97706;
                position: relative;
                box-sizing: border-box;
                text-align: center;
                background-image: radial-gradient(circle, #ffffff 60%, #fcfbf7 100%);
              }
              .cert-title {
                font-family: 'Cinzel', Georgia, serif;
                font-size: 30px;
                font-weight: 700;
                color: #b45309;
                margin-top: 5px;
                margin-bottom: 2px;
                letter-spacing: 3px;
              }
              .cert-subtitle {
                font-size: 9px;
                letter-spacing: 1px;
                color: #64748b;
                text-transform: uppercase;
                margin-bottom: 15px;
              }
              .cert-recipient-label {
                font-size: 11px;
                color: #475569;
                font-style: italic;
                margin-bottom: 5px;
              }
              .cert-recipient-name {
                font-family: Georgia, serif;
                font-size: 24px;
                font-weight: 700;
                color: #0f172a;
                border-bottom: 2px solid #e2e8f0;
                display: inline-block;
                padding-bottom: 3px;
                margin-bottom: 15px;
                min-width: 250px;
              }
              .cert-text {
                font-size: 12px;
                line-height: 1.5;
                color: #334155;
                margin: 0 auto 15px auto;
                max-width: 450px;
              }
              .cert-award {
                font-family: Georgia, serif;
                font-size: 16px;
                font-weight: 700;
                color: #d97706;
                margin-bottom: 25px;
              }
              .cert-footer {
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                position: absolute;
                bottom: 25px;
                left: 30px;
                right: 30px;
              }
              .cert-sig {
                border-top: 1px solid #cbd5e1;
                padding-top: 3px;
                width: 140px;
                font-size: 9px;
                color: #64748b;
              }
              .cert-seal {
                width: 60px;
                height: 60px;
                border: 3px dashed #d97706;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 8px;
                font-weight: 700;
                color: #d97706;
                text-transform: uppercase;
                background-color: #fef3c7;
                letter-spacing: 0.5px;
                line-height: 1.1;
              }
            `}} />

            {/* Printable Certificate Template */}
            <div id="certificate-print-area" className="w-full overflow-auto p-2">
              <div className="cert-card mx-auto">
                <div className="cert-title">ДИПЛОМ</div>
                <div className="cert-subtitle">DARYNSPACE БІЛІМ БЕРУ ПЛАТФОРМАСЫ</div>
                <div className="cert-recipient-label">Осы дипломмен марапатталады:</div>
                <div className="cert-recipient-name">{profile.full_name || 'Оқушы'}</div>
                <div className="cert-text">
                  Шығармашылық белсенділік пен білім сапасын арттыруға бағытталған платформадағы
                  <strong> «{selectedCert.title}» </strong> 
                  жарысында көрсеткен жоғары жетістіктері мен үздік білімі үшін
                </div>
                <div className="cert-award">{selectedCert.type} ({selectedCert.score})</div>
                <div className="cert-footer">
                  <div className="cert-sig">
                    Күні: {selectedCert.date}<br/>
                    ID: {selectedCert.id}
                  </div>
                  <div className="cert-seal">
                    Daryn<br/>Space<br/>2026
                  </div>
                  <div className="cert-sig">
                    Жетекші:<br/>
                    <strong>Тулекова Б.Т.</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal actions */}
            <div className="mt-6 flex gap-3 w-full justify-end">
              <button
                onClick={() => setSelectedCert(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Жабу
              </button>
              <button
                onClick={handlePrint}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-semibold rounded-xl shadow-lg shadow-amber-500/20 transition-colors cursor-pointer"
              >
                🖨️ Басып шығару / PDF жүктеу
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
