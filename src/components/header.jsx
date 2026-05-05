import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/GPC_Logo.png';
import './header.css';
import DrawerMenu from './DrawerMenu';

const Header = () => {
  const navigate = useNavigate();

  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth' 
    });
  };

  return (
    <header className="navbar">
      <div className="navbar-logo">
        <Link to="/" className="logo-button">
          <img src={logo} alt="GPC Logo" className="logo-img" />
        </Link>
      </div>
      
      <nav className="navbar-links">
        <Link to="/home" onClick={handleScrollToTop}>Home</Link>
        <Link to="/about" onClick={() => navigate("/about")}>About</Link>
        <Link to="/requests">Requests</Link>
        <Link to="/events">Events</Link>
        <Link to="/messages">Messages</Link>
        <Link to="/admin">Admin</Link>
        <DrawerMenu />
      </nav>
    </header>
  );
};

export default Header;