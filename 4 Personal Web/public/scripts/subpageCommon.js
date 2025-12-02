$(document).ready(function () {
  // Underline the current page on navbar & disable it
  const current = window.location.pathname;

  $(".navbar-items-col a").each(function () {
    const id = $(this).attr("id");
    if (current.indexOf(id) > -1) {
      $(this).addClass("nav-item-highlight");
      $(this).on("click", function(e) {
        e.preventDefault();
      })
    }
  });
});