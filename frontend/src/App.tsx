import React, { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts'
import { Activity, Brain, UserPlus, List } from 'lucide-react'

const ROWS = ['Never', 'Sometimes', 'Frequently'] as const
const COLS = ['High', 'Medium', 'Low'] as const

type AiUsage = typeof ROWS[number]
type Performance = typeof COLS[number]

type StudentRecord = {
  id: string
  name: string
  rollNo: string
  branch: string
  aiUsage: AiUsage
  studentScore: number
  grammarlyScore: number
  finalScore: number
  performance: Performance
}

type ChiResult = {
  chi2: number
  dof: number
  pValue: number
  criticalValue: number
  rejectNull: boolean
  expected: number[][]
  conclusion: string
}

/* ─── Pure-JS Chi-Square (no network needed) ─── */
function chiSF(x: number, k: number): number {
  // Approximation of chi-square survival function via regularised gamma
  // Using Wilson-Hilferty normal approximation for speed
  const z = Math.pow(x / k, 1 / 3)
  const mu = 1 - 2 / (9 * k)
  const sigma = Math.sqrt(2 / (9 * k))
  const t = (z - mu) / sigma
  // Standard normal SF
  return 0.5 * (1 - erf(t / Math.SQRT2))
}

function erf(x: number): number {
  const t = 1 / (1 + 0.5 * Math.abs(x))
  const tau = t * Math.exp(
    -x * x - 1.26551223 +
    t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
    t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 +
    t * (1.48851587 + t * (-0.82215223 + t * 0.17087294))))))))
  )
  return x >= 0 ? 1 - tau : tau - 1
}

function chi2PPF(p: number, k: number): number {
  // Wilson-Hilferty inverse CDF approximation
  const h = 2 / (9 * k)
  const z = chiInvNorm(p)
  return k * Math.pow(1 - h + z * Math.sqrt(h), 3)
}

function chiInvNorm(p: number): number {
  // Beasley-Springer-Moro approximation for N^-1(p)
  const q = p - 0.5
  if (Math.abs(q) <= 0.42) {
    const r = q * q
    return q * ((((-25.44106049245) * r + 41.3911977353) * r + (-18.6150006252)) * r + 2.5066282388) /
           ((((3.13731083354) * r + (-21.0622410182)) * r + 23.0833674374) * r + 1)
  }
  const r = Math.log(-Math.log(q < 0 ? p : 1 - p))
  return (q < 0 ? -1 : 1) * (2.515517 + 0.802853 * r + 0.010328 * r * r) /
         (1 + 1.432788 * r + 0.189269 * r * r + 0.001308 * r * r * r)
}

function computeChiSquare(table: number[][]): ChiResult | null {
  const PSEUDO = 1e-6
  const obs = table.map(row => row.map(v => v + PSEUDO))

  const rowSums = obs.map(row => row.reduce((a, b) => a + b, 0))
  const colSums = obs[0].map((_, j) => obs.reduce((a, row) => a + row[j], 0))
  const total = rowSums.reduce((a, b) => a + b, 0)

  if (total <= 0) return null

  const expected = obs.map((_, i) => obs[0].map((_, j) => (rowSums[i] * colSums[j]) / total))

  const chi2 = obs.reduce((sum, row, i) =>
    sum + row.reduce((s, o, j) => s + Math.pow(o - expected[i][j], 2) / expected[i][j], 0), 0
  )

  const dof = (obs.length - 1) * (obs[0].length - 1)
  const pValue = chiSF(chi2, dof)
  const criticalValue = chi2PPF(0.95, dof)
  const rejectNull = chi2 >= criticalValue

  return {
    chi2,
    dof,
    pValue,
    criticalValue,
    rejectNull,
    expected,
    conclusion: rejectNull
      ? 'Reject H0: AI usage and academic performance are associated.'
      : 'Fail to reject H0: AI usage appears independent of academic performance.'
  }
}

export default function App() {
  const [students, setStudents] = useState<StudentRecord[]>([])

  const [name, setName] = useState('')
  const [rollNo, setRollNo] = useState('')
  const [branch, setBranch] = useState('')
  const [aiUsage, setAiUsage] = useState<AiUsage>('Sometimes')
  const [studentScore, setStudentScore] = useState<string>('')
  const [grammarlyScore, setGrammarlyScore] = useState<string>('')

  const [formError, setFormError] = useState<string | null>(null)
  const [mainPage, setMainPage] = useState<'home' | 'analytics'>('home')

  /* ─── Derived table — recompute instantly ─── */
  const derivedTable = useMemo(() => {
    const t = [[0,0,0],[0,0,0],[0,0,0]]
    students.forEach(s => {
      const r = ROWS.indexOf(s.aiUsage)
      const c = COLS.indexOf(s.performance)
      if (r !== -1 && c !== -1) t[r][c] += 1
    })
    return t
  }, [students])

  const isTableEmpty = derivedTable.flat().every(v => v === 0)

  /* ─── Chi-Square result — pure synchronous JS ─── */
  const result: ChiResult | null = useMemo(() => {
    if (isTableEmpty) return null
    return computeChiSquare(derivedTable)
  }, [derivedTable, isTableEmpty])

  /* ─── Chart data ─── */
  const chartData = useMemo(() => {
    if (!result) return []
    const data: any[] = []
    ROWS.forEach((r, i) => {
      COLS.forEach((c, j) => {
        data.push({
          name: `${r} / ${c}`,
          Observed: derivedTable[i][j],
          Expected: parseFloat(result.expected[i][j].toFixed(2))
        })
      })
    })
    return data
  }, [result, derivedTable])

  /* ─── Impact logic ─── */
  const isPositiveImpact = useMemo(() => {
    if (!result) return false
    const boostHigh = derivedTable[2][0] - result.expected[2][0]
    const boostLow  = derivedTable[2][2] - result.expected[2][2]
    return (boostHigh - boostLow) > 0
  }, [result, derivedTable])

  /* ─── Add Student ─── */
  function handleAddStudent(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !rollNo || !branch || studentScore === '' || grammarlyScore === '') {
      setFormError('Please fill all fields.'); return
    }
    const sScore = Number(studentScore)
    const gScore = Number(grammarlyScore)
    if (sScore < 0 || sScore > 10 || gScore < 0 || gScore > 10) {
      setFormError('Scores must be between 0 and 10.'); return
    }

    const finalScore = (sScore + gScore) / 2
    const performance: Performance = finalScore >= 7.5 ? 'High' : finalScore >= 4.0 ? 'Medium' : 'Low'

    setStudents(prev => [...prev, {
      id: Math.random().toString(36).slice(2),
      name, rollNo, branch, aiUsage,
      studentScore: sScore, grammarlyScore: gScore, finalScore, performance
    }])

    setName(''); setRollNo(''); setBranch('')
    setAiUsage('Sometimes'); setStudentScore(''); setGrammarlyScore('')
    setFormError(null)
  }

  const previewFinal = (studentScore !== '' && grammarlyScore !== '')
    ? ((Number(studentScore) + Number(grammarlyScore)) / 2).toFixed(1)
    : '--'

  return (
    <div id="app">
      {/* ── NAVBAR ── */}
      <nav className="navbar">
        <div className="nav-brand">
          <Brain size={28} />
          <span>ChiSight Analytics</span>
        </div>
        <div className="nav-tabs">
          <button className={`nav-tab ${mainPage === 'home' ? 'active' : ''}`} onClick={() => setMainPage('home')}>
            <UserPlus size={18} /> Data Entry
          </button>
          <button className={`nav-tab ${mainPage === 'analytics' ? 'active' : ''}`} onClick={() => setMainPage('analytics')}>
            <Activity size={18} /> Analytics & Prediction
          </button>
        </div>
      </nav>

      <div className="dashboard-container">

        {/* ══════════════════ HOME PAGE ══════════════════ */}
        {mainPage === 'home' && (
          <div className="glass-card">
            {/* Description */}
            <div className="app-description">
              <h2>Understand AI Impact with Data</h2>
              <p>
                <strong>The Problem:</strong> As AI tools become ubiquitous in education, institutions
                struggle to understand whether frequent AI usage genuinely improves academic performance
                or acts as a deceptive crutch that leads to lower grades.
              </p>
              <p>
                <strong>The Solution:</strong> Enter individual student performance data below.
                We record their self-reported AI usage alongside their raw scores, and use the
                <strong> Chi-Square test of independence</strong> (computed instantly in-browser) to
                highlight statistical correlation patterns.
              </p>
            </div>

            <div style={{display:'flex', gap:'32px', flexWrap:'wrap'}}>

              {/* ── FORM ── */}
              <div style={{flex:'1 1 400px'}}>
                <h3 style={{display:'flex', alignItems:'center', gap:'8px'}}><UserPlus size={20}/> Add Student Data</h3>

                {formError && (
                  <div style={{padding:'12px', background:'rgba(239,68,68,0.2)', border:'1px solid rgba(239,68,68,0.5)', borderRadius:'8px', color:'#fca5a5', marginBottom:'16px'}}>
                    {formError}
                  </div>
                )}

                <form onSubmit={handleAddStudent} style={{display:'flex', flexDirection:'column', gap:'16px', background:'rgba(59,130,246,0.05)', padding:'24px', borderRadius:'16px', border:'1px solid rgba(59,130,246,0.2)'}}>

                  <div style={{display:'flex', gap:'16px'}}>
                    <div className="input-group" style={{flex:1, marginBottom:0}}>
                      <label className="input-label">Student Name
                        <input className="input" placeholder="e.g. Jane Doe" value={name} onChange={e => setName(e.target.value)}/>
                      </label>
                    </div>
                    <div className="input-group" style={{flex:1, marginBottom:0}}>
                      <label className="input-label">Roll No.
                        <input className="input" placeholder="e.g. CS-001" value={rollNo} onChange={e => setRollNo(e.target.value)}/>
                      </label>
                    </div>
                  </div>

                  <div className="input-group" style={{marginBottom:0}}>
                    <label className="input-label">Branch / Major
                      <input className="input" placeholder="e.g. Computer Science" value={branch} onChange={e => setBranch(e.target.value)}/>
                    </label>
                  </div>

                  <div className="input-group" style={{marginBottom:0}}>
                    <label className="input-label">AI Usage Frequency
                      <select className="input" value={aiUsage} onChange={e => setAiUsage(e.target.value as AiUsage)} style={{background:'rgba(15,23,42,0.8)'}}>
                        <option value="Never">Never (Rarely uses AI)</option>
                        <option value="Sometimes">Sometimes (Occasional assistance)</option>
                        <option value="Frequently">Frequently (Heavy reliance)</option>
                      </select>
                    </label>
                  </div>

                  <div style={{display:'flex', gap:'16px'}}>
                    <div className="input-group" style={{flex:1, marginBottom:0}}>
                      <label className="input-label">Student Input Score (0–10)
                        <input className="input" type="number" step="0.1" min="0" max="10" placeholder="e.g. 8.5" value={studentScore} onChange={e => setStudentScore(e.target.value)}/>
                      </label>
                    </div>
                    <div className="input-group" style={{flex:1, marginBottom:0}}>
                      <label className="input-label">Grammarly Score (0–10)
                        <input className="input" type="number" step="0.1" min="0" max="10" placeholder="e.g. 9.0" value={grammarlyScore} onChange={e => setGrammarlyScore(e.target.value)}/>
                      </label>
                    </div>
                  </div>

                  <div style={{padding:'12px', background:'rgba(0,0,0,0.3)', borderRadius:'8px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <span style={{color:'var(--accent-light)', fontWeight:500}}>Predicted Final Score:</span>
                    <span style={{fontFamily:'var(--mono)', fontSize:'1.2rem', color:'#4ade80', fontWeight:'bold'}}>{previewFinal}</span>
                  </div>

                  <button type="submit" className="button" style={{marginTop:'8px'}}>Save Student Record</button>
                </form>
              </div>

              {/* ── STUDENT LIST ── */}
              <div style={{flex:'1 1 360px', display:'flex', flexDirection:'column'}}>
                <h3 style={{display:'flex', alignItems:'center', gap:'8px'}}><List size={20}/> Recorded Students ({students.length})</h3>
                <div style={{flex:1, background:'rgba(0,0,0,0.2)', border:'1px solid var(--glass-border)', borderRadius:'16px', overflow:'hidden'}}>
                  {students.length === 0 ? (
                    <div style={{padding:'40px', textAlign:'center', color:'rgba(255,255,255,0.4)'}}>
                      <UserPlus size={48} style={{opacity:0.3, marginBottom:'16px'}}/>
                      <p>No students recorded yet.</p>
                    </div>
                  ) : (
                    <div style={{overflowY:'auto', maxHeight:'500px'}}>
                      <table className="matrix" style={{fontSize:'0.9rem'}}>
                        <thead style={{position:'sticky', top:0, zIndex:10}}>
                          <tr><th>Name</th><th>AI Usage</th><th>Final</th><th>Level</th></tr>
                        </thead>
                        <tbody>
                          {students.map(s => (
                            <tr key={s.id}>
                              <td>
                                <div style={{fontWeight:500}}>{s.name}</div>
                                <div style={{fontSize:'0.75rem', opacity:0.6}}>{s.rollNo} · {s.branch}</div>
                              </td>
                              <td>{s.aiUsage}</td>
                              <td style={{fontFamily:'var(--mono)'}}>{s.finalScore.toFixed(1)}</td>
                              <td>
                                <span style={{
                                  padding:'2px 10px', borderRadius:'12px', fontSize:'0.8rem',
                                  background: s.performance==='High'?'rgba(74,222,128,0.2)':s.performance==='Medium'?'rgba(250,204,21,0.2)':'rgba(239,68,68,0.2)',
                                  color: s.performance==='High'?'#4ade80':s.performance==='Medium'?'#facc15':'#fca5a5'
                                }}>
                                  {s.performance}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ══════════════════ ANALYTICS PAGE ══════════════════ */}
        {mainPage === 'analytics' && (
          <div className="glass-card">
            <h2>Analysis Report &amp; Predictions</h2>

            {isTableEmpty ? (
              <div style={{textAlign:'center', padding:'64px', color:'rgba(255,255,255,0.6)'}}>
                <Activity size={64} style={{marginBottom:'16px', opacity:0.5}}/>
                <p>No data yet. Add students on the Data Entry page.</p>
              </div>
            ) : (
              <>
                {/* ── CHIT TEST ANALYTICS TABLE ── */}
                <h3>ChiTest Analytics Matrix</h3>
                <p style={{fontSize:'0.9rem', color:'rgba(255,255,255,0.6)', marginBottom:'12px'}}>
                  Aggregate grid from {students.length} student{students.length !== 1 ? 's' : ''}.
                </p>
                <div className="matrix-container">
                  <table className="matrix">
                    <thead>
                      <tr>
                        <th>AI Usage ╲ Score</th>
                        {COLS.map(c => <th key={c}>{c} Performance</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {ROWS.map((r, i) => (
                        <tr key={r}>
                          <td>{r}</td>
                          {COLS.map((_, j) => <td key={j}>{derivedTable[i][j]}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ── STAT BOXES ── */}
                {result && (
                  <div className="results-grid">
                    <div className="stat-box">
                      <span className="stat-label">Chi-Square (χ²)</span>
                      <span className="stat-value">{result.chi2.toFixed(4)}</span>
                    </div>
                    <div className="stat-box">
                      <span className="stat-label">P-Value</span>
                      <span className="stat-value">{result.pValue.toFixed(6)}</span>
                    </div>
                    <div className="stat-box">
                      <span className="stat-label">Conclusion</span>
                      <span className="stat-value" style={{fontSize:'1.1rem', color: result.rejectNull ? '#93c5fd' : '#9ca3af'}}>
                        {result.rejectNull ? 'Reject H0 (Linked)' : 'Fail to reject (Independent)'}
                      </span>
                    </div>
                    <div className="stat-box" style={{background: isPositiveImpact ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)'}}>
                      <span className="stat-label">Predicted AI Impact</span>
                      <span className={`stat-value ${isPositiveImpact ? 'impact-positive' : 'impact-negative'}`}>
                        {isPositiveImpact ? 'POSITIVE (+)' : 'NEGATIVE (−)'}
                      </span>
                    </div>
                  </div>
                )}

                <p style={{fontWeight:500, color:'var(--accent-light)', fontSize:'1.05rem', margin:'16px 0'}}>
                  {result?.conclusion}
                </p>

                {/* ── CHART ── */}
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{top:20, right:30, left:-20, bottom:5}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false}/>
                      <XAxis dataKey="name" tick={{fill:'rgba(255,255,255,0.6)', fontSize:11}} stroke="rgba(255,255,255,0.2)"/>
                      <YAxis tick={{fill:'rgba(255,255,255,0.6)', fontSize:12}} stroke="rgba(255,255,255,0.2)" allowDecimals={false}/>
                      <RechartsTooltip
                        contentStyle={{background:'rgba(15,23,42,0.95)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', color:'#fff'}}
                        itemStyle={{color:'#fff'}}
                      />
                      <Legend wrapperStyle={{fontSize:'14px', paddingTop:'10px'}}/>
                      <Bar dataKey="Observed" fill={isPositiveImpact ? '#4ade80' : '#f87171'} radius={[6,6,0,0]} animationDuration={400}/>
                      <Bar dataKey="Expected" fill="#64748b" radius={[6,6,0,0]} animationDuration={400}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
