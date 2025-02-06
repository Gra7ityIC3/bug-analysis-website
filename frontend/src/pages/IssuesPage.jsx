import { useState } from 'react'
import './IssuesPage.css'

function IssuesPage() {
  const [issues, setIssues] = useState([{database: "PostgreSQL", title: "PGSQL Bla Bla", description: "Something is not working and blabla"}])
  return (
    <div className='issues-page'>
      <div className='issues-header'>
        <h2>Issues Found</h2>
        <button>This should be the filter image</button>
      </div>
      
      <div className='issues-div'>
        {issues.map(issue => {
            return(
              <div className='issue-div'>
                <label>[{issue.database}] {issue.title}</label>
                <p>{issue.description}</p>
              </div>
            )
        })}
      </div>
    </div>
  )
}

export default IssuesPage
