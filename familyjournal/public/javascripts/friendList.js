jQuery(document).ready(function($) { //Have to do this because the form will not exist till after load.
  const $form = $("#friendRequestForm");

  $form.on("submit", submitHandler);

  function submitHandler(e) {
    e.preventDefault();

    $.ajax({
      url: "friends/requestFriend",
      type: "POST",
      data: $form.serialize()
    });

    $form[0].reset();
  }
});
