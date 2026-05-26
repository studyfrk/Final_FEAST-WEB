import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header.jsx';

const UserLayout = () => {
  return (
    <>
      <Header />
      <Outlet />
    </>
  );
};

export default UserLayout;
