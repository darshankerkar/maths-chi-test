import React, { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Activity, Brain, UserPlus, List, CheckCircle, AlertTriangle, Info, BookOpen, GraduationCap, ArrowRight } from 'lucide-react'

const ROWS = ['Never', 'Sometimes', 'Frequently'] as const
const COLS = ['High', 'Medium', 'Low'] as const

type AiUsage = typeof ROWS[number]
type Performance = typeof COLS[number]

export function getPerformanceCategory(score: number): Performance {
  if (score >= 8) return 'High';
  if (score >= 5) return 'Medium';
  return 'Low';
}

export function generateInsight(obs: number[][]): string {
  const freqRow = obs[2];
  const totalFreq = freqRow.reduce((a, b) => a + b, 0);
  if (totalFreq === 0) return "Not enough data on frequent AI users to formulate a specific behavioral insight.";

  const maxFreqCount = Math.max(...freqRow);
  const maxC = freqRow.indexOf(maxFreqCount);
  const perf = COLS[maxC];

  if (perf === 'High') return `Students with frequent AI usage are mostly in the high performance category, suggesting a highly beneficial impact.`;
  if (perf === 'Medium') return `Students with frequent AI usage are mostly in the medium performance category, suggesting AI may help consistency but not top performance.`;
  return `Students with frequent AI usage are mostly in the low performance category, suggesting potential over-reliance on AI as a crutch without deep understanding.`;
}

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
  const z = Math.pow(x / k, 1 / 3)
  const mu = 1 - 2 / (9 * k)
  const sigma = Math.sqrt(2 / (9 * k))
  const t = (z - mu) / sigma
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
  const h = 2 / (9 * k)
  const z = chiInvNorm(p)
  return k * Math.pow(1 - h + z * Math.sqrt(h), 3)
}

function chiInvNorm(p: number): number {
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
      ? `The Chi-Square test indicates a statistically significant relationship between the variables (χ² = ${chi2.toFixed(2)}, p = ${pValue.toFixed(4)}).`
      : `Based on the Chi-Square test (χ² = ${chi2.toFixed(2)}, p = ${pValue.toFixed(4)}), there is no statistically significant relationship between the variables. This suggests independence.`
  }
}

export default function App() {
  const downloadResult = () => {
  const element = document.querySelector(".dashboard-container") as HTMLElement;

  if (!element) return;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = element.scrollWidth;
  canvas.height = element.scrollHeight;

  ctx?.fillRect(0, 0, canvas.width, canvas.height);

  const data = new XMLSerializer().serializeToString(element);

  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(data);

  img.onload = function () {
    ctx?.drawImage(img, 0, 0);

    const link = document.createElement("a");
    link.download = "ChiSight-Report.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };
};
  const [students, setStudents] = useState<StudentRecord[]>([])
  const [name, setName] = useState('')
  const [rollNo, setRollNo] = useState('')
  const [branch, setBranch] = useState('Computer Science')
  const [customBranch, setCustomBranch] = useState('')
  const [aiUsage, setAiUsage] = useState<AiUsage>('Sometimes')
  const [studentScore, setStudentScore] = useState<string>('')
  const [grammarlyScore, setGrammarlyScore] = useState<string>('')
  
  const [formError, setFormError] = useState<string | null>(null)
  const [mainPage, setMainPage] = useState<'home' | 'analytics'>('home')
  const [isCalculating, setIsCalculating] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [filterAi, setFilterAi] = useState<AiUsage | 'All'>('All')
  const [filterPerf, setFilterPerf] = useState<Performance | 'All'>('All')

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

  const result: ChiResult | null = useMemo(() => {
    if (isTableEmpty || students.length < 20) return null
    return computeChiSquare(derivedTable)
  }, [derivedTable, isTableEmpty, students.length])

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

  const impactAnalysis = useMemo(() => {
    if (!result) return { state: 'None', reasoning: '' };
    if (!result.rejectNull) {
      return { state: 'None', reasoning: 'Variables are independent; no significant directional impact.' };
    }
    const boostHigh = derivedTable[2][0] - result.expected[2][0]
    const boostLow  = derivedTable[2][2] - result.expected[2][2]
    const isPositive = (boostHigh - boostLow) > 0;
    return {
      state: isPositive ? 'Positive' : 'Negative',
      reasoning: isPositive 
        ? 'Higher AI usage aligns with high performance expectations.'
        : 'Higher AI usage aligns with low performance expectations.'
    };
  }, [result, derivedTable])

  const pieData = useMemo(() => {
    let low = 0, med = 0, high = 0;
    students.forEach(s => {
      if (s.performance === 'Low') low++
      else if (s.performance === 'Medium') med++
      else if (s.performance === 'High') high++
    });
    return [
      { name: 'Low', value: low, color: 'var(--danger)' },
      { name: 'Medium', value: med, color: 'var(--warning)' },
      { name: 'High', value: high, color: 'var(--success)' },
    ].filter(d => d.value > 0);
  }, [students])

  const majorityCategory = useMemo(() => {
    if (pieData.length === 0) return '';
    const max = pieData.reduce((prev, current) => (prev.value > current.value) ? prev : current)
    return max.name;
  }, [pieData])

  const simpleTrend = useMemo(() => {
    if (students.length === 0) return { label: 'No Data', icon: '→', trend: 'none' }
    const freqHigh = derivedTable[2][0];
    const freqLow = derivedTable[2][2];
    
    if (freqHigh > freqLow) return { label: 'Positive Trend', icon: '↑', trend: 'positive' }
    if (freqLow > freqHigh) return { label: 'Negative Trend', icon: '↓', trend: 'negative' }
    return { label: 'No Clear Trend', icon: '→', trend: 'neutral' }
  }, [derivedTable, students.length])

  const groupedBarData = useMemo(() => {
    return ROWS.map((r, i) => ({
      name: r,
      High: derivedTable[i][0],
      Medium: derivedTable[i][1],
      Low: derivedTable[i][2],
    }))
  }, [derivedTable])

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.rollNo.toLowerCase().includes(searchQuery.toLowerCase())
      const matchAi = filterAi === 'All' || s.aiUsage === filterAi
      const matchPerf = filterPerf === 'All' || s.performance === filterPerf
      return matchSearch && matchAi && matchPerf
    })
  }, [students, searchQuery, filterAi, filterPerf])

  function handleAddStudent(e: React.FormEvent) {
    e.preventDefault()
    const finalBranch = branch === 'Other' ? customBranch.trim() : branch;
    if (!name || !rollNo || !finalBranch || studentScore === '' || grammarlyScore === '') {
      setFormError('Please fill all required fields.'); return
    }
    const sScore = Number(studentScore)
    const gScore = Number(grammarlyScore)
    if (sScore < 0 || sScore > 10 || gScore < 0 || gScore > 10) {
      setFormError('Scores must be between 0.0 and 10.0.'); return
    }

    const finalScore = (sScore + gScore) / 2
    const performance: Performance = getPerformanceCategory(finalScore)

    setIsCalculating(true)
    setTimeout(() => {
      setStudents(prev => [...prev, {
        id: Math.random().toString(36).slice(2),
        name, rollNo, branch: finalBranch, aiUsage,
        studentScore: sScore, grammarlyScore: gScore, finalScore, performance
      }])
      setName(''); setRollNo(''); setBranch('Computer Science'); setCustomBranch('')
      setAiUsage('Sometimes'); setStudentScore(''); setGrammarlyScore('')
      setFormError(null)
      setIsCalculating(false)
    }, 300)
  }

  const navigateToAnalytics = () => {
    if (students.length >= 20) {
      setIsCalculating(true)
      setTimeout(() => {
        setMainPage('analytics')
        setIsCalculating(false)
      }, 400)
    }
  }

  const previewFinalNum = (studentScore !== '' && grammarlyScore !== '')
    ? (Number(studentScore) + Number(grammarlyScore)) / 2
    : null;
  const previewFinal = previewFinalNum !== null ? previewFinalNum.toFixed(1) : '--'
  const previewCategory = previewFinalNum !== null ? getPerformanceCategory(previewFinalNum) : null;

  return (
    <div id="app">
      <nav className="navbar">
        <div className="nav-brand">
          <Brain size={24} color="var(--primary)" />
          <span>ChiSight</span>
        </div>
        <div className="nav-tabs">
          <button className={`nav-tab ${mainPage === 'home' ? 'active' : ''}`} onClick={() => setMainPage('home')}>
            <UserPlus size={16} /> Data Entry
          </button>
          <button 
            className={`nav-tab ${mainPage === 'analytics' ? 'active' : ''}`} 
            onClick={navigateToAnalytics}
            disabled={students.length < 20}
            title={students.length < 20 ? "Insufficient data. Minimum 20 samples recommended." : ""}
          >
            <Activity size={16} /> Analytics
          </button>
        </div>
      </nav>

      <div className="dashboard-container">
        
        {/* ———— DATA ENTRY TAB ———— */}
        {mainPage === 'home' && (
          <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
            <div className="section-header">
              <h1>Understand AI Impact with Data</h1>
              <p style={{ maxWidth: '800px' }}>
                Collect and analyze student performance data against their self-reported AI tool usage. 
                Using the <strong>Chi-Square test of independence</strong>, this dashboard highlights statistical correlation patterns instantly.
              </p>
            </div>

            {students.length < 20 && (
              <div className="alert alert-warning">
                <AlertTriangle size={20} />
                <div>
                  <strong>Insufficient Data for Analysis</strong>
                  <div style={{fontSize: '0.85rem', marginTop: '4px', opacity: 0.9}}>
                    Currently tracking <strong>{students.length}</strong> {students.length === 1 ? 'student' : 'students'}. 
                    A minimum of 20 samples is statistically recommended before running predictions.
                  </div>
                </div>
              </div>
            )}

            <div className="dashboard-grid">
              
              {/* Form Card */}
              <div className="saas-card">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserPlus size={20} color="var(--primary)" /> Record Entry
                </h2>
                <p>Input individual student performance metrics.</p>

                {formError && (
                  <div className="alert" style={{ background: 'var(--danger-bg)', border: '1px solid var(--border)', color: 'var(--danger)', padding: '12px' }}>
                    {formError}
                  </div>
                )}

                <form onSubmit={handleAddStudent} style={{ marginTop: '24px' }}>
                  {/* Personal Info */}
                  <div className="form-group">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span className="text-muted"><Info size={14}/></span> Identity</h3>
                    <div className="form-row">
                      <div>
                        <label className="form-label">Full Name</label>
                        <input className="form-input" placeholder="e.g. Jane Doe" value={name} onChange={e => setName(e.target.value)} />
                      </div>
                      <div>
                        <label className="form-label">Identifier / Roll No.</label>
                        <input className="form-input" placeholder="e.g. CS-001" value={rollNo} onChange={e => setRollNo(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  {/* Academic Context */}
                  <div className="form-group">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span className="text-muted"><BookOpen size={14}/></span> Academic Context</h3>
                    <div className="form-row">
                      <div>
                        <label className="form-label">Department / Major</label>
                        <select className="form-input" value={branch} onChange={e => setBranch(e.target.value)}>
                          <option value="Computer Science">Computer Science</option>
                          <option value="Information Technology">Information Technology</option>
                          <option value="Biomedical">Biomedical</option>
                          <option value="Electronics">Electronics</option>
                          <option value="Other">Other</option>
                        </select>
                        {branch === 'Other' && (
                          <div style={{ marginTop: '8px', animation: 'fadeIn 0.2s ease-in' }}>
                            <input 
                              className="form-input" 
                              placeholder="Please specify..." 
                              value={customBranch} 
                              onChange={e => setCustomBranch(e.target.value)} 
                            />
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="form-label">AI Tool Usage</label>
                        <select className="form-input" value={aiUsage} onChange={e => setAiUsage(e.target.value as AiUsage)}>
                          <option value="Never">Never (Rarely uses AI)</option>
                          <option value="Sometimes">Sometimes (Occasional assistance)</option>
                          <option value="Frequently">Frequently (Heavy reliance)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="form-group">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span className="text-muted"><GraduationCap size={14}/></span> Evaluation Scores</h3>
                    <div className="form-row">
                      <div>
                        <label className="form-label">Subject Score (0-10)</label>
                        <input className="form-input" type="number" step="0.1" min="0" max="10" placeholder="0.0" value={studentScore} onChange={e => setStudentScore(e.target.value)} />
                      </div>
                      <div>
                        <label className="form-label">Grammarly Score (0-10)</label>
                        <input className="form-input" type="number" step="0.1" min="0" max="10" placeholder="0.0" value={grammarlyScore} onChange={e => setGrammarlyScore(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-base)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Projected Final Output</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>0-4.9 Low • 5-7.9 Medium • 8-10 High</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '1.5rem', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--primary)' }}>{previewFinal}</span>
                      {previewCategory && (
                        <span className={`badge badge-${previewCategory === 'High' ? 'success' : previewCategory === 'Medium' ? 'warning' : 'danger'}`}>
                          {previewCategory}
                        </span>
                      )}
                    </div>
                  </div>

                  <button type="submit" className="btn-primary" disabled={isCalculating}>
                    {isCalculating ? 'Processing...' : <><CheckCircle size={18}/> Commit Record</>}
                  </button>
                </form>
              </div>

              {/* Table Card */}
              <div className="saas-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <List size={20} color="var(--primary)" /> Active Logs
                  </h2>
                  <span className="badge badge-primary">{students.length} records</span>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                   <input className="form-input" style={{ flex: 1, minWidth: '150px', padding: '8px 12px' }} placeholder="Search name or roll no..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                   <select className="form-input" style={{ width: 'auto', padding: '8px 12px' }} value={filterAi} onChange={e => setFilterAi(e.target.value as AiUsage | 'All')}>
                     <option value="All">All AI Usage</option>
                     <option value="Never">Never</option>
                     <option value="Sometimes">Sometimes</option>
                     <option value="Frequently">Frequently</option>
                   </select>
                   <select className="form-input" style={{ width: 'auto', padding: '8px 12px' }} value={filterPerf} onChange={e => setFilterPerf(e.target.value as Performance | 'All')}>
                     <option value="All">All Performance</option>
                     <option value="High">High</option>
                     <option value="Medium">Medium</option>
                     <option value="Low">Low</option>
                   </select>
                </div>

                <div className="table-container" style={{ flex: 1, minHeight: '400px', maxHeight: '650px', display: 'flex', flexDirection: 'column' }}>
                  {students.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
                      <Activity size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>No data yet.</div>
                      <div style={{ fontSize: '0.9rem', marginTop: '8px' }}>Add student records using the entry panel to begin analysis.</div>
                    </div>
                  ) : filteredStudents.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
                      <Activity size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>No matches found.</div>
                      <div style={{ fontSize: '0.9rem', marginTop: '8px' }}>Try adjusting your search or filters.</div>
                    </div>
                  ) : (
                    <table className="saas-table">
                      <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr>
                          <th>Student</th>
                          <th>AI Usage</th>
                          <th>Final</th>
                          <th>Category</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map(s => (
                          <tr key={s.id}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{s.name}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{s.rollNo}</div>
                            </td>
                            <td>{s.aiUsage}</td>
                            <td style={{ fontFamily: 'var(--mono)' }}>{s.finalScore.toFixed(1)}</td>
                            <td>
                              <span 
                                title={`(Rule: 0–4.9 Low, 5.0–7.9 Medium, 8.0–10 High)`}
                                className={`badge badge-${s.performance === 'High' ? 'success' : s.performance === 'Medium' ? 'warning' : 'danger'}`}
                                style={{ cursor: 'help' }}
                              >
                                {s.performance}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ———— ANALYTICS TAB ———— */}
        {mainPage === 'analytics' && (
          <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h1>Statistical Analysis Dashboard</h1>
                <p style={{ margin: 0 }}>Review inferential statistics and correlation insights based on your {students.length} recorded samples.</p>
              </div>
              <button className="btn-primary" style={{ width: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} onClick={() => setMainPage('home')}>
                Back to Entry
              </button>
            </div>

            {students.length < 20 ? (
              <div className="saas-card" style={{ textAlign: 'center', padding: '64px' }}>
                <AlertTriangle size={48} color="var(--warning)" style={{ marginBottom: '16px', opacity: 0.8 }}/>
                <h2>Insufficient Scope</h2>
                <p>You need a minimum of 20 samples to generate reliable statistical predictions.</p>
                <button className="btn-primary" style={{ width: 'auto', margin: '24px auto 0' }} onClick={() => setMainPage('home')}>Add More Records</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                
                {/* Hypothesis & Conclusion Strip */}
                <div className="saas-card" style={{ background: 'linear-gradient(145deg, var(--bg-card) 0%, rgba(30, 41, 59, 0.4) 100%)', borderLeft: `4px solid ${result?.rejectNull ? 'var(--success)' : 'var(--warning)'}` }}>
                  <h3>Hypothesis Outcome</h3>
                  <div style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.5, marginBottom: '16px' }}>
                    {result?.conclusion}
                  </div>
                  <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                    <div style={{ flex: 1, minWidth: '250px' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Tested Null Hypothesis (H0)</div>
                      <div style={{ fontSize: '0.95rem' }}>No relationship between AI usage and academic performance.</div>
                    </div>
                    <div style={{ flex: 1, minWidth: '250px' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Tested Alternative (H1)</div>
                      <div style={{ fontSize: '0.95rem' }}>There is a relationship between AI usage and academic performance.</div>
                    </div>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                {result && (
                  <div className="stat-grid">
                    <div className="stat-box-modern">
                      <div className="stat-box-title">Chi-Square (χ²)</div>
                      <div className="stat-box-value">{result.chi2.toFixed(4)}</div>
                      <div className="stat-box-subtext">Calculated Test Statistic</div>
                    </div>
                    <div className="stat-box-modern">
                      <div className="stat-box-title">P-Value</div>
                      <div className="stat-box-value">{result.pValue.toFixed(6)}</div>
                      <div className="stat-box-subtext">Significance Level (α=0.05)</div>
                    </div>
                    <div className="stat-box-modern" style={{ background: result.rejectNull ? 'var(--success-bg)' : 'var(--warning-bg)', borderColor: result.rejectNull ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)' }}>
                      <div className="stat-box-title" style={{ color: result.rejectNull ? 'var(--success)' : 'var(--warning)' }}>Verdict</div>
                      <div className="stat-box-value" style={{ fontSize: '1.5rem', marginTop: 'auto', color: result.rejectNull ? 'var(--success)' : 'var(--warning)' }}>
                        {result.rejectNull ? 'Relationship Found' : 'Independent'}
                      </div>
                    </div>
                    <div className="stat-box-modern" style={{ position: 'relative', overflow: 'hidden' }}>
                      <div className="stat-box-title">Impact Vector</div>
                      <div className="stat-box-value" style={{ fontSize: '1.5rem', marginTop: 'auto', color: impactAnalysis.state === 'Positive' ? 'var(--success)' : impactAnalysis.state === 'Negative' ? 'var(--danger)' : 'var(--text-secondary)' }}>
                        {impactAnalysis.state === 'None' ? 'Neutral' : impactAnalysis.state}
                      </div>
                    </div>
                    <div className="stat-box-modern">
                      <div className="stat-box-title">Observed Trend</div>
                      <div className="stat-box-value" style={{ fontSize: '1.5rem', marginTop: 'auto', color: simpleTrend.trend === 'positive' ? 'var(--success)' : simpleTrend.trend === 'negative' ? 'var(--danger)' : 'var(--text-secondary)' }}>
                        {simpleTrend.label} <span style={{ fontFamily: 'sans-serif' }}>{simpleTrend.icon}</span>
                      </div>
                      <div className="stat-box-subtext">Freq Users High vs Low</div>
                    </div>
                  </div>
                )}

                {/* Main Views */}
                <div className="dashboard-grid">
                  <div className="chart-wrapper">
                    <h3 style={{ marginBottom: '24px' }}>Observed vs Expected Distribution</h3>
                    <div style={{ height: 'calc(100% - 50px)' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                          <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} stroke="var(--border)" tickMargin={10} />
                          <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} stroke="var(--border)" allowDecimals={false} />
                          <RechartsTooltip
                            contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: '8px', color: 'var(--text-primary)', boxShadow: 'var(--glass-shadow)' }}
                            itemStyle={{ color: 'var(--text-primary)', fontWeight: 500 }}
                            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                          />
                          <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '20px', color: 'var(--text-secondary)' }} />
                          <Bar name="Actual Recorded (Observed)" dataKey="Observed" fill={impactAnalysis.state === 'Positive' ? 'var(--success)' : impactAnalysis.state === 'Negative' ? 'var(--danger)' : 'var(--primary)'} radius={[4, 4, 0, 0]} animationDuration={800} />
                          <Bar name="Statistical Baseline (Expected)" dataKey="Expected" fill="var(--text-muted)" radius={[4, 4, 0, 0]} animationDuration={800} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="chart-wrapper">
                    <h3 style={{ marginBottom: '24px' }}>Performance Distribution</h3>
                    <div style={{ height: 'calc(100% - 90px)' }}>
                      {pieData.length === 0 ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                          No data available to display distribution
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={5}
                              dataKey="value"
                              animationDuration={800}
                              label={({name, percent}) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <RechartsTooltip 
                               contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: '8px', color: 'var(--text-primary)', boxShadow: 'var(--glass-shadow)' }}
                               itemStyle={{ color: 'var(--text-primary)', fontWeight: 500 }}
                            />
                            <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '10px', color: 'var(--text-secondary)' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                    {pieData.length > 0 && (
                      <div style={{ marginTop: '24px', fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                        Majority of students fall under <strong style={{ color: 'var(--text-primary)' }}>{majorityCategory}</strong>, indicating overall performance trend.
                      </div>
                    )}
                  </div>
                </div>

                <div className="dashboard-grid">
                  <div className="saas-card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ margin: 0 }}>Frequency Matrix</h3>
                      <span className="badge badge-primary" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                        df = {result?.dof}
                      </span>
                    </div>
                    <div className="table-container" style={{ flex: 1 }}>
                      <table className="saas-table" style={{ fontSize: '0.85rem' }}>
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th>Observed</th>
                            <th>Expected</th>
                          </tr>
                        </thead>
                        <tbody>
                          {chartData.map((d, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: 500 }}>{d.name}</td>
                              <td>{d.Observed}</td>
                              <td style={{ color: 'var(--text-muted)' }}>{d.Expected.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ marginTop: '24px', background: 'var(--primary-bg)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Machine Insight</div>
                      <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                        {generateInsight(derivedTable)}
                        {impactAnalysis.reasoning && (
                          <span style={{ display: 'block', marginTop: '8px', color: 'var(--primary)', opacity: 0.9 }}>
                            <ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}/> 
                            {impactAnalysis.reasoning}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="chart-wrapper">
                    <h3 style={{ marginBottom: '24px' }}>AI Usage vs Performance</h3>
                    <div style={{ height: 'calc(100% - 50px)' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={groupedBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                          <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} stroke="var(--border)" tickMargin={10} />
                          <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} stroke="var(--border)" allowDecimals={false} />
                          <RechartsTooltip
                            contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: '8px', color: 'var(--text-primary)', boxShadow: 'var(--glass-shadow)' }}
                            itemStyle={{ color: 'var(--text-primary)', fontWeight: 500 }}
                            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                          />
                          <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '20px', color: 'var(--text-secondary)' }} />
                          <Bar name="Low Performance" dataKey="Low" fill="var(--danger)" radius={[4, 4, 0, 0]} animationDuration={800} />
                          <Bar name="Medium Performance" dataKey="Medium" fill="var(--warning)" radius={[4, 4, 0, 0]} animationDuration={800} />
                          <Bar name="High Performance" dataKey="High" fill="var(--success)" radius={[4, 4, 0, 0]} animationDuration={800} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}
      </div>

      {mainPage === 'analytics' && (
  <div style={{
    marginTop: '20px',
    display: 'flex',
    justifyContent: 'center'
  }}>
    <button
      className="btn-primary"
      onClick={downloadResult}
      style={{
        width: 'auto',
        padding: '12px 20px',
        fontSize: '14px'
      }}
    >
      Download Full Report
    </button>
  </div>
)}
      <footer className="app-footer">
        Powered by Chi-Square Statistical Analysis Engine • Local Implementation
      </footer>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
