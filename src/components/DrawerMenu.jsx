import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./drawer_menu.module.css";

const DrawerMenu = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.drawerMenu}>
      <div className={styles.item}>
        <a href="#" className={`${styles.anchor} ${styles.link}`}>
          <span> Our Services </span>
          {/* Added styles.icon class here */}
          <svg viewBox="0 0 360 360" className={styles.icon}>
            <g id="SVGRepo_iconCarrier">
              <path d="M325.607,79.393c-5.857-5.857-15.355-5.858-21.213,0.001l-139.39,139.393L25.607,79.393 c-5.857-5.857-15.355-5.858-21.213,0.001c-5.858,5.858-5.858,15.355,0,21.213l150.004,150c2.813,2.813,6.628,4.393,10.606,4.393 s7.794-1.581,10.606-4.394l149.996-150C331.465,94.749,331.465,85.251,325.607,79.393z"></path>
            </g>
          </svg>
        </a>

        <div className={styles.drawerSubmenu}>
          <div className={styles.drawerSubmenuItem}>
            <a
              href="#"
              className={`${styles.anchor} ${styles.drawerSubmenuLink}`}
              onClick={() => navigate("/appguide")}
            >
              {" "}
              App Guide{" "}
            </a>
          </div>
          <div className={styles.drawerSubmenuItem}>
            <a
              href="#"
              className={`${styles.anchor} ${styles.drawerSubmenuLink}`}
              onClick={() => navigate("/contactus")}
            >
              {" "}
              Contact Us{" "}
            </a>
          </div>
          <div className={styles.drawerSubmenuItem}>
            <a
              href="#"
              className={`${styles.anchor} ${styles.drawerSubmenuLink}`}
              onClick={() => navigate("/helpfaq")}
            >
              {" "}
              Help & FAQ{" "}
            </a>
          </div>
          <div className={styles.drawerSubmenuItem}>
            <a
              href="#"
              className={`${styles.anchor} ${styles.drawerSubmenuLink}`}
              onClick={() => navigate("/terms")}
            >
              {" "}
              Terms & Conditions{" "}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrawerMenu;
