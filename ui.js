$(async function () {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredStories = $("#filtered-stories");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-stories");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $createStory = $('#create-story');
  const $favoritesTab = $("#favorites-tab");
  const $favoritedStories = $("#favorited-stories");
  const $myStories = $('#my-stories');
  const $separators = $('.separators');
  const $myStoriesTab = $('#my-stories-tab')


  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  // global currentTab variable;
  let $currentList = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    if(password.length < 8){
      alert("Your password is too weak. Use 8 or more characters!");
      throw new Error("Your password is too weak.");
    }

    try{
      // call the create method, which calls the API and then builds a new user instance
      const newUser = await User.create(username, password, name);
      currentUser = newUser;
      syncCurrentUserToLocalStorage();
      loginAndSubmitForm();
    }
    catch(error){
      alert("This username has been taken!")
    }
  });

  /**
   * Event listener for create story link
   * Toggles create story submit form to be visible
   */
  $createStory.on("click", function () {
    $submitForm.slideToggle();
  });

  /**
   * Event listener for creating a story
   * If successful, we will add story to the API, and clear DOM and
   * generate new list of stories.
   */
  $submitForm.on("submit", async function (e) {
    e.preventDefault();
    const author = $('#author').val();
    const title = $('#title').val();
    const url = $('#url').val();

    const newStory = {
      author,
      title,
      url
    };

    // Reset form and hide it.
    $submitForm.trigger("reset");
    $submitForm.hide();

    // Post new story to the story list and then prepend that story to the DOM.
    const addedStory = await storyList.addStory(currentUser, newStory);
    currentUser.ownStories.push(addedStory);
    const result = generateStoryHTML(addedStory);
    if ($currentList !== $favoritedStories) $currentList.prepend(result);

  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function () {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function () {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event handler for Favoriting a story
   */
  $(".articles-list").on("click", ".favorite", function (e) {
    if (currentUser) {

      // get the star that will be either filled or unfilled
      let starElement = $(e.target);

      // add or remove favorite, both for the server and the currentUser object
      let favoriteId = starElement.closest("li")[0].id;
      currentUser.toggleFavorite(favoriteId);

      //fill or unfill star
      starElement.toggleClass("far fas");

    } else {
      alert('Please login to add favorites!');
    }
  });

  /**
   * Event handler for Deleting a story
   */
  $('.articles-list').on("click", ".delete-story-button", function (e) {
    let deleteButton = $(e.target);
    let createdStory = deleteButton.closest("li")[0];

    currentUser.deleteStory(createdStory.id);
    createdStory.remove();
  });

  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function () {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  /**
   * Event handler for Navigation to Favorites
   */
  $("body").on("click", "#favorites-tab", function () {
    hideElements();
    generateFavorites();
    $favoritedStories.show();
  });

  /**
   * Event handler for Navigation to My stories
   */
  $("body").on("click", "#my-stories-tab", function () {
    hideElements();
    generateMyStories();
    $myStories.show();
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {

    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variables
    storyList = storyListInstance;
    $currentList = $allStoriesList
    // empty out that part of the page
    $favoritedStories.empty();
    $allStoriesList.empty();
    $myStories.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  /**
   *
   */

  function generateFavorites() {
    $currentList = $favoritedStories;
    $favoritedStories.empty();
    $allStoriesList.empty();
    $myStories.empty();
    for (let favoriteStory of currentUser.favorites) {
      const result = generateStoryHTML(favoriteStory);

      $favoritedStories.append(result);
    }
  }

  function generateMyStories() {
    $currentList = $myStories
    $myStories.empty();
    $allStoriesList.empty();
    $favoritedStories.empty();
    for (let myStory of currentUser.ownStories) {
      const result = generateStoryHTML(myStory);

      $myStories.prepend(result);
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);

    // DISPLAY CORRECT FAVORITES IN LIST
    let starType = (currentUser && currentUser.hasFavorite(story.storyId)) ? "fas" : "far"

    // DISPLAY REMOVE BUTTON ON USER'S STORIES
    let buttonHtml = (currentUser && currentUser.hasCreatedStory(story.storyId)) ?
    "<button class='delete-story-button'>Delete Story</button>" : "";

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        <i class="fa-star ${starType} favorite" style="margin: 0 3px"></i>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}
          ${buttonHtml}
        </small>

      </li>
    `);

    return storyMarkup;
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredStories,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $favoritedStories
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $createStory.show();
    $favoritesTab.show();
    $myStoriesTab.show();
    $separators.show();
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});