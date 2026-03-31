import { useState } from 'react'

type ChiSquareResponse = {
  chi2: number
  dof: number
  critical_value: number
  p_value: number
  expected: number[][]
  alpha: number
  reject_null: boolean
  conclusion: string
}

const DEFAULT_ROWS = ['Never', 'Sometimes', 'Frequently'] as const
const DEFAULT_COLS = ['High', 'Medium', 'Low'] as const
const DEFAULT_TABLE = [
  [5, 12, 8],
  [10, 15, 5],
  [15, 8, 2],
] as const

function clampLabel(label: string) {
  return label.trim() || '(unnamed)'
}

export default function App() {
  const [rows, setRows] = useState<string[]>(() => [...DEFAULT_ROWS])
  const [cols, setCols] = useState<string[]>(() => [...DEFAULT_COLS])
  const [table, setTable] = useState<number[][]>(() => DEFAULT_TABLE.map((r) => [...r]))
  const [alpha, setAlpha] = useState<string>('0.05')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ChiSquareResponse | null>(null)

  function setCell(i: number, j: number, value: number) {
    setTable((prev) => prev.map((row, ri) => (ri === i ? row.map((v, ci) => (ci === j ? value : v)) : row)))
  }

  async function runTest() {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const a = Number(alpha)
      if (!Number.isFinite(a) || a <= 0 || a >= 1) {
        throw new Error('Alpha must be a number between 0 and 1 (e.g., 0.05).')
      }

      // Basic validation: non-negative numeric counts.
      for (const row of table) {
        for (const v of row) {
          if (!Number.isFinite(v) || v < 0) throw new Error('All table counts must be non-negative numbers.')
        }
      }

      const res = await fetch('/api/chi-square', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: rows.map(clampLabel),
          cols: cols.map(clampLabel),
          table,
          alpha: a,
        }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Backend error (${res.status}): ${text || res.statusText}`)
      }

      const data: ChiSquareResponse = await res.json()
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div id="app">
      <main className="container">
        <h1>Chi-Square Test</h1>
        <p className="subtitle">
          Analyze the association between <b>AI tool usage</b> and <b>academic performance</b>.
        </p>

        <section className="card">
          <h2>Inputs</h2>

          <div className="row">
            <label>
              Significance level (alpha)
              <input
                className="input"
                value={alpha}
                onChange={(e) => setAlpha(e.target.value)}
                inputMode="decimal"
              />
            </label>
          </div>

          <div className="gridLabels">
            <div />
            {cols.map((c, j) => (
              <label key={c + j}>
                <span className="labelText">Col {j + 1}</span>
                <input
                  className="input"
                  value={c}
                  onChange={(e) => setCols((prev) => prev.map((x, idx) => (idx === j ? e.target.value : x)))}
                />
              </label>
            ))}
          </div>

          <div className="tableWrap">
            <table className="matrix">
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r + i}>
                    <th>
                      <input
                        className="input"
                        value={r}
                        onChange={(e) => setRows((prev) => prev.map((x, idx) => (idx === i ? e.target.value : x)))}
                      />
                    </th>
                    {cols.map((_, j) => (
                      <td key={`${i}-${j}`}>
                        <input
                          className="input cell"
                          type="number"
                          min={0}
                          step={1}
                          value={table[i][j]}
                          onChange={(e) => setCell(i, j, Number(e.target.value))}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="actions">
            <button className="button" onClick={runTest} disabled={loading}>
              {loading ? 'Computing...' : 'Run Chi-Square'}
            </button>
            <button
              className="button secondary"
              onClick={() => {
                setRows([...DEFAULT_ROWS])
                setCols([...DEFAULT_COLS])
                setTable(DEFAULT_TABLE.map((r) => [...r]))
                setAlpha('0.05')
                setError(null)
                setResult(null)
              }}
              disabled={loading}
              type="button"
            >
              Reset example dataset
            </button>
          </div>
        </section>

        {error ? (
          <section className="card alert">
            <h2>Error</h2>
            <p>{error}</p>
          </section>
        ) : null}

        {result ? (
          <section className="card">
            <h2>Results</h2>
            <div className="resultsGrid">
              <div>
                <span className="k">Chi-square (chi2)</span>
                <div className="v">{result.chi2.toFixed(4)}</div>
              </div>
              <div>
                <span className="k">Degrees of freedom (dof)</span>
                <div className="v">{result.dof}</div>
              </div>
              <div>
                <span className="k">Critical value</span>
                <div className="v">{result.critical_value.toFixed(4)}</div>
              </div>
              <div>
                <span className="k">p-value</span>
                <div className="v">{result.p_value.toFixed(6)}</div>
              </div>
              <div>
                <span className="k">Decision</span>
                <div className="v">{result.reject_null ? 'Reject H0' : 'Fail to reject H0'}</div>
              </div>
            </div>

            <p className="conclusion">{result.conclusion}</p>

            <h3>Expected frequencies</h3>
            <div className="tableWrap">
              <table className="matrix expected">
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r + i}>
                      <th>{r}</th>
                      {cols.map((_, j) => (
                        <td key={`${i}-${j}`}>
                          {Number(result.expected[i][j]).toFixed(4)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  )
}

