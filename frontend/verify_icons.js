import * as fa from "react-icons/fa";

const iconsToCheck = [
  'FaGithub',
  'FaCode',
  'FaTrophy',
  'FaCheckCircle',
  'FaExternalLinkAlt',
  'FaUser',
  'FaBuilding',
  'FaFire',
  'FaChartBar',
  'FaStar',
  'FaBook',
  'FaHome',
  'FaSearch',
  'FaCog',
  'FaBell',
  'FaCircle',
  "FiTrophy",
  "FaFire",
  
  // Custom mappings/candidates
  'FaArrowRight',
  'FaArrowLeft',
  'FaChevronRight',
  'FaMap',
  'FaFlag',
  'FaCompass',
  'FaHistory',
  'FaClock',
  'FaFileAlt',
  'FaCalendarAlt',
  'FaCalendar',
  'FaGitBranch',
  'FaExclamationCircle',
  'FaSpinner',
  'FaShareAlt',
  'FaTimes',
  'FaCopy',
  'FaCheck',
  'FaBars',
  'FaSignOutAlt',
  'FaTachometerAlt',
  'FaLinkedin',
  'FaShieldAlt'
];

console.log("Checking icons...");
const missing = [];
iconsToCheck.forEach(iconName => {
  if (fa[iconName]) {
    console.log(`[OK] ${iconName} is exported.`);
  } else {
    console.log(`[MISSING] ${iconName} is NOT exported!`);
    missing.push(iconName);
  }
});

if (missing.length > 0) {
  console.log("\nSome icons are missing:", missing);
  process.exit(1);
} else {
  console.log("\nAll checked icons are available!");
  process.exit(0);
}
