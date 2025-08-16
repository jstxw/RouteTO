import React from "react";
import "../index.css";
import logo from "../assets/logo.png";
import Forms from "./Forms";


const Nav = () => {
 return (
   <>
       <nav className="navbar">
       <div className="navbar-left">
           <img src={logo} alt="Logo" />
           <div className="logo-text">RouteTO</div>
       </div>
       <div className="navbar-right">
           <a href="#">navigate with confidence</a>
       </div>
       </nav>
       <div className="gray-box">
           <h1 className="saferoute"> Plan your Safe Route </h1>
           <div className="container">
               <h3> Starting Point </h3>
               <h3> Destination </h3>
           </div>
        <Forms/>
       </div>

   </>
 );
};


export default Nav;


