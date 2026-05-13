import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from nltk.tokenize import sent_tokenize, RegexpTokenizer
from nltk.corpus import stopwords
from collections import Counter
import string
import time 

# Download packages silently
nltk.download('vader_lexicon', quiet=True)
nltk.download('punkt', quiet=True)
nltk.download('punkt_tab', quiet=True) 
nltk.download('stopwords', quiet=True) 
nltk.download('averaged_perceptron_tagger_eng', quiet=True)

def analyze_journal(journal_text: str) -> dict:
    # --- Start the performance timer ---
    start_time = time.time()
    
    raw_paragraphs = [p.strip() for p in journal_text.split('\n') if p.strip()]
    
    if not raw_paragraphs:
        return {"calculated_mood_score": 3, "overall_themes": [], "paragraph_breakdown": []}

    analyzer = SentimentIntensityAnalyzer()
    
    # r'\w+' tells Python: "Only match alphanumeric characters. Ignore ALL quotes, commas, etc."
    word_cleaner = RegexpTokenizer(r'\w+')
    
    stop_words = set(stopwords.words('english'))
    
    total_compound_score = 0
    total_sentences_processed = 0  # <-- Counter for all sentences
    emotional_sentences_count = 0  # <-- Counter for dilution fix
    all_journal_themes = []
    paragraph_breakdown = []

    for idx, paragraph in enumerate(raw_paragraphs):
        sentences = sent_tokenize(paragraph)
        if not sentences:
            continue
            
        para_themes = []
        
        for sentence in sentences:
            total_sentences_processed += 1  # <-- Count every sentence
            
            # VADER gets the RAW sentence (with quotes) because it needs them for context
            sentiment_dict = analyzer.polarity_scores(sentence)
            compound = sentiment_dict['compound']
            
            # --- The Sentiment Dilution Fix ---
            # Only count the score AND extract themes if the sentence actually has emotion
            if abs(compound) > 0.1:
                total_compound_score += compound
                emotional_sentences_count += 1
                
                # THEME EXTRACTION gets the CLEANED sentence (no quotes)
                clean_words = word_cleaner.tokenize(sentence.lower())
                tagged_words = nltk.pos_tag(clean_words)
                
                for word, tag in tagged_words:
                    if word not in stop_words and len(word) > 2:
                        if tag.startswith('NN') or tag.startswith('JJ'):
                            para_themes.append(word)
                            all_journal_themes.append(word)
        
        para_theme_counts = Counter(para_themes)
        top_para_themes = [theme for theme, count in para_theme_counts.most_common(3)]
        
        paragraph_breakdown.append({
            "paragraph_number": idx + 1,
            "text": paragraph,
            "themes": top_para_themes
        })

    # --- Updated Math to handle the Dilution Fix ---
    if emotional_sentences_count == 0:
        mapped_mood_score = 3
    else:
        avg_compound_score = total_compound_score / emotional_sentences_count
        # Multiplied by 2.5 to amplify sensitivity since we are dropping filler
        mapped_mood_score = round((avg_compound_score + 1) * 2.5) 
        
    mapped_mood_score = max(1, min(5, mapped_mood_score))
    
    overall_counts = Counter(all_journal_themes)
    top_overall_themes = [theme for theme, count in overall_counts.most_common(5)]
    
    # --- Calculate Latency and Print Metrics ---
    end_time = time.time()
    latency_ms = round((end_time - start_time) * 1000, 2)
    neutral_ignored = total_sentences_processed - emotional_sentences_count

    print("\n" + "="*30)
    print("[NLP PIPELINE METRICS]")
    print("="*30)
    print(f"Processing Latency : {latency_ms} ms")
    print(f"Total Sentences    : {total_sentences_processed}")
    print(f"Emotional Counted  : {emotional_sentences_count}")
    print(f"Neutral Ignored    : {neutral_ignored}")
    print(f" Final Calculated Mood Score : {mapped_mood_score}/5")
    print("="*30 + "\n")

    return {
        "calculated_mood_score": mapped_mood_score,
        "overall_themes": top_overall_themes,
        "paragraph_breakdown": paragraph_breakdown
    }