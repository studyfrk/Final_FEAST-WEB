import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './header.jsx';

const UserLayout = () => {
  return (
    <>
      <Header />
      <Outlet />
    </>
  );
};

export default UserLayout;
