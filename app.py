import pickle
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np # <-- ADD THIS IMPORT

# --- 1. Initialize Your App ---
app = Flask(__name__)
CORS(app) 

# --- 2. Load Your Model Files ---
try:
    print("Loading model files...")
    # Load the movie list (DataFrame)
    movies_list_df = pickle.load(open('movies_list.pkl', 'rb'))
    # Load the movie "DNA" vectors (Embeddings)
    movie_embeddings = pickle.load(open('movie_embeddings.pkl', 'rb'))
    print("Model files loaded successfully.")
except FileNotFoundError:
    print("ERROR: Model files not found. Make sure 'movies_list.pkl' and 'movie_embeddings.pkl' are in the folder.")
    exit()

# --- 3. Your Existing Recommendation Function ---
def get_recommendations(movie_title):
    try:
        # Find the index of the movie that was passed in
        movie_index = movies_list_df[movies_list_df['title'] == movie_title].index[0]
    except IndexError:
        print(f"Movie '{movie_title}' not in dataset.")
        return []

    # --- THIS IS THE "LIVE" CALCULATION ---
    # 1. Get the "DNA" vector for the movie you liked
    movie_vector = movie_embeddings[movie_index]
    
    # 2. Reshape it for the calculation
    movie_vector = movie_vector.reshape(1, -1)
    
    # 3. Calculate its similarity to ALL other movie vectors
    scores = cosine_similarity(movie_vector, movie_embeddings)
    
    # 4. Get the scores for all movies
    scores = scores[0] 
    # -------------------------------------------

    # Sort and get the top 20, just like before
    movies_with_scores = sorted(list(enumerate(scores)), reverse=True, key=lambda x: x[1])
    
    recommended_movies = []
    for i in movies_with_scores[1:21]:
        recommended_movie_index = i[0]
        title = movies_list_df.iloc[recommended_movie_index].title
        recommended_movies.append(title)
        
    return recommended_movies

# --- 4. Your Existing API Endpoint ---
@app.route('/recommend')
def recommend():
    movie_title = request.args.get('movie')
    if not movie_title:
        return jsonify({"error": "No movie title provided"}), 400
        
    print(f"Received request for: {movie_title}")
    recommendations = get_recommendations(movie_title)
    return jsonify({"recommendations": recommendations})

# --- 5. NEW "TASTE PROFILE" ENDPOINT ---
@app.route('/get-feed', methods=['POST'])
def get_personalized_feed():
    # Define the weights for each list
    weights = {
        "liked": 1.0,
        "watched": 0.75,
        "watching": 0.75,
        "watchlist": 0.25,
        "disliked": -1.0
    }

    # Get the lists of titles from the POST request
    data = request.json
    # Use the *exact* keys your JavaScript will send:
    liked_titles = data.get('liked_titles', [])
    watched_titles = data.get('watched_titles', [])
    watching_titles = data.get('watching_titles', [])
    watchlist_titles = data.get('watchlist_titles', [])
    disliked_titles = data.get('disliked_titles', [])

    all_vectors = []
    
    # Combine all titles into a "seen" set to filter out later
    seen_titles = set(liked_titles) | set(watched_titles) | set(watching_titles) | set(watchlist_titles) | set(disliked_titles)

    # Helper function to find vector and apply weight
    def add_vectors_with_weight(titles, weight):
        for title in titles:
            try:
                movie_index = movies_list_df[movies_list_df['title'] == title].index[0]
                all_vectors.append(movie_embeddings[movie_index] * weight)
            except IndexError:
                # Movie wasn't in our model, skip it
                pass 

    # Add all vectors with their correct weights
    add_vectors_with_weight(liked_titles, weights['liked'])
    add_vectors_with_weight(watched_titles, weights['watched'])
    add_vectors_with_weight(watching_titles, weights['watching'])
    add_vectors_with_weight(watchlist_titles, weights['watchlist'])
    add_vectors_with_weight(disliked_titles, weights['disliked'])

    # If user has no data, we can't recommend
    if not all_vectors:
        print("No valid movie data found for this user.")
        return jsonify({"recommendations": []})

    # --- Create the "Taste Profile" vector by averaging ---
    taste_vector = np.mean(all_vectors, axis=0)

    # Find movies similar to this "Taste Profile"
    scores = cosine_similarity(taste_vector.reshape(1, -1), movie_embeddings)[0]
    
    movies_with_scores = sorted(list(enumerate(scores)), reverse=True, key=lambda x: x[1])

    # Create the final list, filtering out movies the user has already seen/rated
    recommended_movies = []
    for i in movies_with_scores:
        movie_index = i[0]
        title = movies_list_df.iloc[movie_index].title
        
        if title not in seen_titles:
            recommended_movies.append(title)
        
        # Stop once we have 20 recommendations
        if len(recommended_movies) >= 20:
            break
            
    print(f"Returning {len(recommended_movies)} feed recommendations.")
    return jsonify({"recommendations": recommended_movies})

# --- 6. Run the App (No Change Here) ---
if __name__ == '__main__':
    print("Starting Flask server...")
    app.run(debug=True, port=5000)