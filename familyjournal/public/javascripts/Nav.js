function removeRequest(id) {
	let element = document.getElementById(id);
	element.parentElement.removeChild(element);
}

function checkRequests() {
	if ( $('#requestList').children().length == 0) {
		$('#requestList').append('<small>You have no requests at this time.</small>');
	}
}

function acceptRequest(id) {
	removeRequest(id);

	$.ajax({
		method: 'GET',
		url: '/friends/acceptRequest/' + id, 
	});

	checkRequests();
}

function declineRequest(id) {
	removeRequest(id);

	$.ajax({
		method: 'GET',
		url: '/friends/declineRequest/' + id, 
	});

	checkRequests();
}

$(function() {
      $('.dropdown').on({
          "click": function(event) {
            if ($(event.target).closest('.dropdown-toggle').length) {
              $(this).data('closable', true);
            } else {
              $(this).data('closable', false);
            }
          },
          "hide.bs.dropdown": function(event) {
            hide = $(this).data('closable');
            $(this).data('closable', true);
            return hide;
          }
      });
  });