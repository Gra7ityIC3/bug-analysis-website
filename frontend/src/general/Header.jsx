import { useState } from 'react'
import './Header.css'
import sqlancerImg from '../assets/sqlancer_logo_logo_pos_500.png'

function Header() {
  return (
    <div className='header'>
        <img src={sqlancerImg}></img>
        <div className='navigation-buttons-div'>
            <a href='/'>Found Bugs</a>
            <a href='/summary'>Summary Statistics</a>
        </div>
    </div>
  )
}

export default Header
