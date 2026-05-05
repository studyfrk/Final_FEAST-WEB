import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DrawerMenu.css";

const DrawerMenu = () => {
    const navigate = useNavigate();

    return (
        <div class="drawer-menu">
        <div class="item">
            <a href="#" class="link">
            <span> Our Services </span>
            <svg viewBox="0 0 360 360" xml:space="preserve">
                <g id="SVGRepo_iconCarrier">
                <path
                    id="XMLID_225_"
                    d="M325.607,79.393c-5.857-5.857-15.355-5.858-21.213,0.001l-139.39,139.393L25.607,79.393 c-5.857-5.857-15.355-5.858-21.213,0.001c-5.858,5.858-5.858,15.355,0,21.213l150.004,150c2.813,2.813,6.628,4.393,10.606,4.393 s7.794-1.581,10.606-4.394l149.996-150C331.465,94.749,331.465,85.251,325.607,79.393z"
                ></path>
                </g>
            </svg>
            </a>
            <div class="drawer-submenu">
            <div class="drawer-submenu-item">
                <a href="#" class="drawer-submenu-link"> App Guide </a>
            </div>
            <div class="drawer-submenu-item">
                <a href="#" class="drawer-submenu-link"> Contact Us </a>
            </div>
            <div class="drawer-submenu-item">
                <a href="#" class="drawer-submenu-link"> Help & FAQ </a>
            </div>
            <div class="drawer-submenu-item">
                <a href="#" class="drawer-submenu-link"> Terms & Conditions </a>
            </div>
            </div>
        </div>
        </div>
    )
}

export default DrawerMenu;
