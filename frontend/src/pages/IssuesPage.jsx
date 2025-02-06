import { useState, useEffect } from 'react'
import './IssuesPage.css'
import axios from 'axios'

function IssuesPage() {
  const [issues, setIssues] = useState([{database: "PostgreSQL", title: "PGSQL Bla Bla", description: "Something is not working and blabla"}])

  useEffect(() => {
    axios.get("http://127.0.0.1:5000/github_issues?datetime=2025-01-15T00:00:00Z")
    .then((resp) => setIssues(resp.data.issues))
    .catch(error => console.log(error))
  }, [])

  return (
    <div className='issues-page'>
      <div className='issues-header'>
        <h2>Issues Found</h2>
        <button>This should be the filter image</button>
      </div>
      
      <div className='issues-div'>
        {issues.map(issue => {
            return(
              <div className='issue-div' key={issues.title}>
                <h3>{issue.title}</h3>
                <p>{issue.link}</p>
                <p>{issue.state}</p>
                <p>{issue.body}</p>
              </div>
            )
        })}
      </div>
    </div>
  )
}

export default IssuesPage
