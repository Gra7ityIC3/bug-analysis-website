import { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Button,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import BugReportIcon from '@mui/icons-material/BugReport';
import BarChartIcon from '@mui/icons-material/BarChart';
import StorageIcon from '@mui/icons-material/Storage';
import sqlancerImg from '../assets/sqlancer_logo_logo_pos_500.png';
import { useLocation } from 'react-router-dom'; 

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
  transition: 'all 0.3s ease-in-out',
}));

const StyledButton = styled(Button)(({ theme, active }) => ({
  textTransform: 'none',
  fontSize: '1.1rem',
  fontWeight: 500,
  color: active ? '#fff' : 'rgba(255, 255, 255, 0.9)',
  padding: '6px 16px',
  borderRadius: '20px',
  transition: 'all 0.3s ease',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    transform: 'scale(1.05)',
    color: '#fff',
  },
  ...(active && {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  }),
}));

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  '& .MuiDrawer-paper': {
    backgroundColor: '#fff',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
    borderLeft: `4px solid ${theme.palette.primary.main}`,
    transition: 'transform 0.3s ease-in-out',
  },
}));

function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation(); // For active link highlighting

  const navItems = [
    { label: 'Found Bugs', path: '/', icon: <BugReportIcon /> },
    { label: 'Summary Statistics', path: '/summary', icon: <BarChartIcon /> },
    { label: 'Database Supported', path: '/database-supported', icon: <StorageIcon /> },
  ];

  const handleDrawerToggle = () => {
    setDrawerOpen(prev => !prev);
  };

  const drawerContent = (
    <Box sx={{ width: 280, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
          SQLancer
        </Typography>
        <IconButton onClick={handleDrawerToggle} color="primary">
          <CloseIcon />
        </IconButton>
      </Box>
      <List>
        {navItems.map(item => (
          <ListItem
            key={item.label}
            component="a"
            href={item.path}
            onClick={handleDrawerToggle}
            sx={{
              py: 1.5,
              borderRadius: 2,
              mb: 1,
              bgcolor: location.pathname === item.path ? 'rgba(25, 118, 210, 0.1)' : 'transparent',
              '&:hover': {
                bgcolor: 'rgba(25, 118, 210, 0.2)',
                transform: 'translateX(5px)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            <ListItemIcon sx={{ color: location.pathname === item.path ? '#1976d2' : 'inherit', minWidth: 40 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                fontWeight: location.pathname === item.path ? 'bold' : 'medium',
                color: location.pathname === item.path ? '#1976d2' : 'text.primary',
              }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <StyledAppBar position="fixed">
      <Toolbar sx={{ justifyContent: 'space-between', py: 2.5}}>
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <img
            src={sqlancerImg}
            alt="SQLancer Logo"
            style={{ height: '45px', transition: 'transform 0.3s ease', '&:hover': { transform: 'scale(1.1)' } }}
            onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.1)')}
            onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
          />
        </Box>

        {/* Desktop Navigation */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2 }}>
          {navItems.map(item => (
            <StyledButton
              key={item.label}
              href={item.path}
              active={location.pathname === item.path ? 1 : 0}
            >
              {item.label}
            </StyledButton>
          ))}
        </Box>

        {/* Mobile Menu Button */}
        <IconButton
          edge="end"
          color="inherit"
          aria-label="menu"
          onClick={handleDrawerToggle}
          sx={{
            display: { xs: 'flex', md: 'none' },
            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.2)' },
          }}
        >
          <MenuIcon sx={{ fontSize: 30 }} />
        </IconButton>
      </Toolbar>

      {/* Mobile Drawer */}
      <StyledDrawer
        anchor="right"
        open={drawerOpen}
        onClose={handleDrawerToggle}
        sx={{ display: { xs: 'block', md: 'none' } }}
      >
        {drawerContent}
      </StyledDrawer>
  </StyledAppBar>
  );
}

export default Header;