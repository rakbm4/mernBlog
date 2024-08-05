import React from "react";
import Header from "./Header";
import { Outlet } from "react-router-dom";
import Footer from "./Footer";

function Layout() {
  return (
    <>
      <div id="sidebar">
        <Header />
        <Outlet />
        <Footer />
      </div>
    </>
  );
}

export default Layout;
