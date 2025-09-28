// --- OMDB CONFIGURATION ---
const API_KEY = 'a6628839'; 
const BASE_URL = 'https://www.omdbapi.com/';
const SEARCH_URL = `${BASE_URL}?s=`; 
const DETAIL_URL = `${BASE_URL}?i=`; 

// --- GLOBAL VARIABLES (For Sorting) ---
const movieGrid = document.getElementById('movie-grid');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const sectionTitle = document.getElementById('section-title');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');
const closeBtn = document.querySelector('.close-btn');

const filterButtons = document.querySelectorAll('.filter-btn');
const sortByDropdown = document.getElementById('sort-by');
let currentMovies = []; // Holds all currently displayed movies for client-side sorting

// --- EVENT LISTENERS ---
searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const searchTerm = searchInput.value.trim();
    if (searchTerm) {
        fetchMovies(searchTerm);
        sectionTitle.textContent = `Search Results for: "${searchTerm}"`;
        filterButtons.forEach(btn => btn.classList.remove('active')); // Clear filter button state
    }
});

closeBtn.onclick = () => { modal.style.display = "none"; }
window.onclick = (e) => {
    if (e.target == modal) {
        modal.style.display = "none";
    }
}

// Initial fetch for a default list 
fetchMovies('movie'); 
sectionTitle.textContent = "Featured Films: Top Movie Hits";


// ----------------------------------------------------------------------
// --- 1. API FETCH FUNCTION (CORRECTED for Multi-Page Fetch) ---
// ----------------------------------------------------------------------

async function fetchMovies(query) {
    const totalPagesToFetch = 3; 
    let allMovies = [];

    // Show loading message
    movieGrid.innerHTML = '<p class="loading-message">Fetching cinematic treasures... This may take a moment.</p>';

    try {
        for (let page = 1; page <= totalPagesToFetch; page++) {
            const finalUrl = `${SEARCH_URL}${query}&page=${page}&apikey=${API_KEY}`;
            
            const response = await fetch(finalUrl);
            const data = await response.json();

            if (data.Response === "True" && Array.isArray(data.Search) && data.Search.length > 0) {
                // Add the movies from this page to our list
                allMovies = allMovies.concat(data.Search);
            } else if (page === 1) {
                // If the first page failed, stop and show error
                movieGrid.innerHTML = `<p style="text-align:center; color:#FF5733;">No movies found for "${query}". Please try a different search term.</p>`;
                return; 
            }
        }

        if (allMovies.length > 0) {
            displayMovies(allMovies);
        } else {
             movieGrid.innerHTML = `<p style="text-align:center; color:#FF5733;">Could not retrieve enough movies.</p>`;
        }

    } catch (error) {
        console.error('Error fetching movies:', error);
        movieGrid.innerHTML = '<p style="text-align:center; color:#FF5733;">Failed to load movies. Check your network connection.</p>';
    }
}


// ----------------------------------------------------------------------
// --- 2. PRE-LOAD RATING FUNCTION ---
// ----------------------------------------------------------------------

async function fetchAndDisplayRating(imdbId, cardElement, movieObject) {
    const detailUrl = `${BASE_URL}?i=${imdbId}&apikey=${API_KEY}`;
    
    try {
        const response = await fetch(detailUrl);
        const data = await response.json();
        
        if (data.Response === "True" && data.imdbRating && data.imdbRating !== 'N/A') {
            const ratingElement = cardElement.querySelector('.movie-rating');
            
            // Update the span text and apply style
            ratingElement.textContent = data.imdbRating; 
            if (parseFloat(data.imdbRating) >= 7.5) {
                 ratingElement.style.backgroundColor = 'green';
            }
            
            // CRITICAL for sorting: Update the movie object in the currentMovies array
            movieObject.imdbRating = data.imdbRating;
            movieObject.Year = data.Year; // Add Year property for sorting
        }
    } catch (error) {
        console.error(`Failed to fetch rating for ${imdbId}:`, error);
    }
}


// ----------------------------------------------------------------------
// --- 3. RENDERING FUNCTIONS (UPDATED for Rating Fetch and Sorting) ---
// ----------------------------------------------------------------------

function displayMovies(movies) {
    movieGrid.innerHTML = ''; 
    
    // CRITICAL for sorting: Save the movies to the global variable
    currentMovies = movies; 

    // Filter out items that are not movies or have no poster
    const filteredMovies = movies.filter(movie => 
        movie.Type === 'movie' && movie.Poster !== 'N/A'
    );

    if (filteredMovies.length === 0) {
        movieGrid.innerHTML = '<p style="text-align:center;">No relevant movie posters found.</p>';
        return;
    }

    filteredMovies.forEach((movie, index) => {
        const { imdbID, Title, Poster } = movie; 
        
        const movieCard = document.createElement('div');
        movieCard.classList.add('movie-card');
        movieCard.setAttribute('data-movie-id', imdbID); 

        movieCard.innerHTML = `
            <img src="${Poster}" alt="${Title} Poster">
            <div class="movie-info">
                <h3>${Title}</h3>
                <span class="movie-rating">...</span> 
            </div>
        `;

        movieCard.addEventListener('click', () => {
            showMovieDetails(imdbID);
        });

        movieGrid.appendChild(movieCard);

        // Fetch rating and update the card asynchronously
        fetchAndDisplayRating(imdbID, movieCard, movie); 

        // STAGGERED FADE-IN EFFECT 
        setTimeout(() => {
            movieCard.style.opacity = 1;
            movieCard.style.transform = 'translateY(0)';
            movieCard.style.animation = 'fadeIn 0.5s ease-out';
        }, index * 100); 
    });
}


// ----------------------------------------------------------------------
// --- 4. DETAIL MODAL FUNCTION (FIXED) ---
// ----------------------------------------------------------------------

function showMovieDetails(imdbId) {
    const DETAIL_URL_FINAL = `${DETAIL_URL}${imdbId}&plot=full&apikey=${API_KEY}`;

    fetch(DETAIL_URL_FINAL)
        .then(response => response.json())
        .then(movie => {
            const { Title, Plot, Released, imdbRating, Runtime, Genre } = movie; 
            
            const reviews = getReviewsFromLocalStorage(imdbId);
            const reviewsHTML = reviews.length > 0 ? 
                reviews.map(r => `
                    <div class="review-item">
                        <strong>${r.user} rated: ${r.rating} / 5 ⭐</strong>
                        <p class="review-comment">"${r.comment}"</p>
                    </div>
                `).join('') :
                '<p>No user reviews yet. Be the first to share your thoughts!</p>';

            // CRITICAL FIX: The entire modal HTML is now correct and clean
            modalBody.innerHTML = `
                <h2>${Title} (${Released ? Released.substring(0, 4) : 'N/A'})</h2>
                <p><strong>Rating:</strong> <span class="movie-rating">${imdbRating || 'N/A'}</span> (IMDb Score)</p>
                <p><strong>Runtime:</strong> ${Runtime || 'N/A'}</p>
                <p><strong>Genre:</strong> ${Genre || 'N/A'}</p>
                <p class="plot-summary">${Plot || 'Plot unavailable.'}</p>

                <div class="review-section">
                    <h3>Community Ratings & Reviews</h3>
                    <div class="review-list">${reviewsHTML}</div>
                    
                    <h4 style="margin-top: 1.5rem;">Submit Your Review</h4>
                    <form id="review-form" data-movie-id="${imdbId}">
                        <div class="star-rating">
                            <input type="radio" id="star5" name="rating" value="5" required><label for="star5" title="5 stars">★</label>
                            <input type="radio" id="star4" name="rating" value="4"><label for="star4" title="4 stars">★</label>
                            <input type="radio" id="star3" name="rating" value="3"><label for="star3" title="3 stars">★</label>
                            <input type="radio" id="star2" name="rating" value="2"><label for="star2" title="2 stars">★</label>
                            <input type="radio" id="star1" name="rating" value="1"><label for="star1" title="1 star">★</label>
                        </div>
                        <textarea name="comment" placeholder="Write your comment here..." required></textarea>
                        <button type="submit" class="search-btn">Post Review</button>
                    </form>
                </div>
            `;

            document.getElementById('review-form').addEventListener('submit', handleReviewSubmit);
            modal.style.display = "block";
        })
        .catch(error => {
            console.error('Error fetching movie details:', error);
            alert('Could not load movie details.');
        });
}


// ----------------------------------------------------------------------
// --- 5. LOCAL STORAGE, SORTING, & FILTERING (Logic Unchanged/Completed) ---
// ----------------------------------------------------------------------

function getReviewsFromLocalStorage(movieId) {
    const reviews = JSON.parse(localStorage.getItem('cinevault_reviews')) || {};
    return reviews[movieId] || [];
}

function saveReviewToLocalStorage(movieId, review) {
    const reviews = JSON.parse(localStorage.getItem('cinevault_reviews')) || {};
    
    if (!reviews[movieId]) {
        reviews[movieId] = [];
    }
    
    reviews[movieId].push(review);
    
    localStorage.setItem('cinevault_reviews', JSON.stringify(reviews));
}

function handleReviewSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const movieId = form.getAttribute('data-movie-id');
    
    const formData = new FormData(form);
    const rating = formData.get('rating');
    const comment = formData.get('comment').trim();

    if (!rating || !comment) {
        alert('Please provide a rating and a comment.');
        return;
    }

    const newReview = {
        user: 'Community Member', // Generic user name
        rating: parseInt(rating),
        comment: comment,
        date: new Date().toLocaleDateString()
    };

    saveReviewToLocalStorage(movieId, newReview);
    alert('Review submitted successfully! Refreshing details...');
    
    // Re-render the modal to show the new review
    showMovieDetails(movieId); 
}


// --- Genre Filtering Logic ---
filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        const query = button.getAttribute('data-query');
        
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        fetchMovies(query + ' movies'); 
        sectionTitle.textContent = `Results for: ${query.toUpperCase()}`;
    });
});


// --- Sorting Logic (Client-Side) ---
sortByDropdown.addEventListener('change', (e) => {
    const sortType = e.target.value;
    if (currentMovies.length > 0) {
        sortMovies(sortType);
    }
});

function sortMovies(sortType) {
    let sortedMovies = [...currentMovies]; 

    if (sortType === 'year') {
        // Sort by Release Year (requires Year property added in fetchAndDisplayRating)
        sortedMovies.sort((a, b) => {
            const yearA = parseInt(a.Year || 0);
            const yearB = parseInt(b.Year || 0);
            return yearB - yearA; // Descending
        });
    } else if (sortType === 'rating') {
        // Sort by Rating (requires imdbRating property added in fetchAndDisplayRating)
        sortedMovies.sort((a, b) => {
            const ratingA = parseFloat(a.imdbRating || 0);
            const ratingB = parseFloat(b.imdbRating || 0);
            return ratingB - ratingA; // Descending
        });
    }
    
    // Re-render the grid with the sorted movies
    displayMovies(sortedMovies);
    sectionTitle.textContent = sectionTitle.textContent.replace(/\s\(Sorted\)/g, '') + ' (Sorted)';
}
