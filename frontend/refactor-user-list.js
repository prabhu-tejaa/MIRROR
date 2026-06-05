const fs = require('fs');
const file = 'src/app/domains/admin/feature/admin-auth/components/admin-user-list/admin-user-list.component.html';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/user\.username\.charAt\(0\)\.toUpperCase\(\)/g, "user.username | userInitials");
content = content.replace(/isUserLocked\(user\)/g, "user | isUserLocked");

fs.writeFileSync(file, content);
console.log("Replaced methods with pipes in admin-user-list.component.html");
