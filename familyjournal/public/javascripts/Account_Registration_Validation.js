function validatePassword() {
	let valid = true;

	let password1 = document.getElementById("password_1").value;
	let password2 = document.getElementById("password_2").value;

	valid = valid && (password1 == password2);

	let re = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/; //Must be 6 long, 1 uppercase, 1 lowercase, 1 digit
	valid = valid && re.test(password1);
	return valid;
}

function validateEmail() {
	let valid = true;
	let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
	let email = document.getElementById("email_address").value;

	valid = valid && re.test(email);
	return valid;
}

function validateForm() {
	let valid = true;
	valid = validatePassword() && validateEmail();
	return valid;
}
