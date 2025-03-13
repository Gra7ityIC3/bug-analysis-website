import { useState } from 'react';
import { IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import sqlancerImg from '../assets/sqlancer_logo_logo_pos_500.png'


function Header() {
  const [opened, setOpened] = useState(false);
  const handleOpenNavMenu = () => {
    setOpened(!opened);
  }

  return (
    <div>
      <div class='flex justify-between items-center p-2'>
        <img class='h-16 md:h-20 m-2 p-2' src={sqlancerImg}></img>
        
        {/* Desktop Navbar */}
        <div class='hidden md:flex'>
          <div class='flex justify-center items-center gap-4 p-2'>
            <a href='/'>Found Bugs</a>
            <a href='/summary'>Summary Statistics</a>
            <a href='/database-supported'>Database Supported</a>
          </div>
        </div>

        {/* Mobile Menu Button*/}
        <div class='xs:flex md:hidden'>
          <IconButton
            size="large"
            onClick={handleOpenNavMenu}
          > 
            { opened ?
              <CloseIcon color='primary' />
            : 
              <MenuIcon color='primary' />
            }
          </IconButton>
        </div>
      </div>

      {/* Mobile Navbar */}
      <div
        class={`lg:hidden ${opened ? 'block' : 'hidden'} mt-2`}
      >
        <div className="flex flex-col space-y-2 mx-6">
          <a href='/'>Found Bugs</a>
          <a href='/summary'>Summary Statistics</a>
          <a href='/database-supported'>Database Supported</a>
        </div>
      </div>
    </div>
  )
}

export default Header
