import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer

# Download the VADER lexicon (the dictionary it uses to understand words)
# This only needs to run once, but it's safe to keep in the script
nltk.download('vader_lexicon', quiet=True)

def analyze_journal_entry(journal_text):
    print("\n" + "="*50)
    print(" NLP MODULE: SENTIMENT ANALYSIS (VADER)")
    print("="*50)
    print(f"Raw Journal Entry: '{journal_text}'")
    
    # Initialize the VADER analyzer
    analyzer = SentimentIntensityAnalyzer()
    
    # Get the sentiment scores
    sentiment_dict = analyzer.polarity_scores(journal_text)
    
    # The 'compound' score is the most important. It ranges from -1 (very sad) to +1 (very happy)
    compound_score = sentiment_dict['compound']
    
    # Convert the -1 to +1 scale into your project's 1 to 5 Mood Score scale
    # Math trick: (compound + 1) makes it 0 to 2. Multiply by 2 makes it 0 to 4. Add 1 makes it 1 to 5.
    mapped_mood_score = round((compound_score + 1) * 2) + 1
    
    # Make sure it stays strictly within the 1-5 bounds just in case
    mapped_mood_score = max(1, min(5, mapped_mood_score))
    
    print(f"\n--- VADER Raw Breakdown ---")
    print(f"Positive content:  {sentiment_dict['pos']*100:.1f}%")
    print(f"Neutral content:   {sentiment_dict['neu']*100:.1f}%")
    print(f"Negative content:  {sentiment_dict['neg']*100:.1f}%")
    print(f"Overall Compound:  {compound_score:.4f} (Scale: -1 to +1)")
    
    print("\n" + "="*50)
    print(" PIPELINE OUTPUT (DATA TO SEND TO ML MODEL)")
    print("="*50)
    print(f"Quantified Mood Score: {mapped_mood_score} / 5")
    
    return mapped_mood_score

# ==========================================
# TEST CASES FOR YOUR REVIEW PANEL
# ==========================================

# Test 1: A great day
entry_1 = "I had an absolutely fantastic day today! The weather was beautiful, and I finally finished that huge project. Feeling very proud and relaxed."
analyze_journal_entry(entry_1)

# Test 2: A terrible day
entry_2 = "I'm feeling really exhausted and burnt out. Everything went wrong at work, and I just wanted to cry. Such a horrible, stressful day."
analyze_journal_entry(entry_2)

# Test 3: A neutral/mixed day
entry_3 = "Today was okay. Nothing special happened. Did some chores, watched a bit of TV, and just hung out."
analyze_journal_entry(entry_3)
entry_4 = "Today felt heavy, with a lingering weight in my chest. Even though nothing specific went wrong, I felt disconnected and sad. I tried to distract myself, but it didn't help. I'm learning it's okay to have days like this."
analyze_journal_entry(entry_4)