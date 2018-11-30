function validatePassword() {
	let valid;

	let password1 = document.getElementById("password_1").value.trim();
	let password2 = document.getElementById("password_2").value.trim();

	valid = (password1 == password2);

	let re = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/; //Must be 6 long, 1 uppercase, 1 lowercase, 1 digit
	valid = valid && re.test(password1);

	if (!valid && !$("#password_2").hasClass("is-invalid"))
	{
		$("#password_1").toggleClass("is-invalid");
		$("#password_2").toggleClass("is-invalid");
	}
	else if (valid && $("#password_2").hasClass("is-invalid"))
	{
		$("#password_1").toggleClass("is-invalid");
		$("#password_2").toggleClass("is-invalid");
	}
	return valid;
}

function validateEmail() {
	let valid;
	let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
	let email = document.getElementById("email_address").value;

	valid = re.test(email);
	if (!valid && !$("#email_address").hasClass("is-invalid"))
	{
		$("#email_address").toggleClass("is-invalid");
	}
	else if (valid && $("#email_address").hasClass("is-invalid"))
	{
		$("#email_address").toggleClass("is-invalid");
	}
	return valid;
}

function validateForm() {
	let valid;
	let validPass = validatePassword();
	let validEmail = validateEmail();
	valid = validPass && validEmail; 
	return valid;
}
