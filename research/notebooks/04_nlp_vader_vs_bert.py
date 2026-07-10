# %% [markdown]
# # Step 4: NLP - VADER vs Transformers
# Goal: Prove that transformer-based NLP outperforms VADER for mood estimation from journal text.

# %%
import os
import pandas as pd
import numpy as np
import time
from nltk.sentiment.vader import SentimentIntensityAnalyzer
import nltk

nltk.download('vader_lexicon', quiet=True)
sia = SentimentIntensityAnalyzer()

# %% [markdown]
# ### Test sentences demonstrating VADER's flaws

# %%
test_sentences = [
    ("I had a great day today, everything went perfectly.", 5), # True Positive
    ("Oh great, another Monday where everything goes wrong.", 1), # Sarcasm (VADER fails)
    ("I don't feel happy at all.", 1), # Negation (VADER struggles)
    ("I am absolutely furious and angry!", 1), # Anger
    ("Not bad, could be worse.", 3) # Neutral/Subtle
]

test_df = pd.DataFrame(test_sentences, columns=["Text", "GroundTruthMood"])

# %% [markdown]
# ### 1. VADER Baseline

# %%
start = time.time()
vader_scores = []
for text in test_df['Text']:
    score = sia.polarity_scores(text)['compound']
    mapped = 3 + (score * 2)
    vader_scores.append(mapped)

vader_time = time.time() - start
test_df['VADER_Score'] = vader_scores

# %% [markdown]
# ### 2. Pre-trained RoBERTa

# %%
from transformers import pipeline

roberta_pipe = pipeline("text-classification", model="cardiffnlp/twitter-roberta-base-sentiment-latest", device=-1)

start = time.time()
roberta_scores = []
for text in test_df['Text']:
    res = roberta_pipe(text)[0]
    if res['label'] == 'positive': mapped = 5
    elif res['label'] == 'negative': mapped = 1
    else: mapped = 3
    roberta_scores.append(mapped)

roberta_time = time.time() - start
test_df['RoBERTa_Score'] = roberta_scores

print(test_df)
print(f"VADER Latency: {vader_time/len(test_df):.4f} s/entry")
print(f"RoBERTa Latency: {roberta_time/len(test_df):.4f} s/entry")

# Save comparison results
test_df.to_csv('/home/fallen/Projects/Main_Project/research/results/nlp_comparison.csv', index=False)

# %% [markdown]
# ### 3. Fine-tuning on GoEmotions (Demo Script)

# %%
from datasets import load_dataset
from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments
import torch

print("\nLoading GoEmotions dataset...")
dataset = load_dataset("google-research-datasets/go_emotions", "simplified")

tokenizer = AutoTokenizer.from_pretrained("roberta-base")
model = AutoModelForSequenceClassification.from_pretrained("roberta-base", num_labels=28)

# Take a tiny subset of 50 samples just to verify the pipeline runs and saves
train_subset = dataset['train'].select(range(50))

def tokenize_function(examples):
    return tokenizer(examples["text"], padding="max_length", truncation=True, max_length=128)

tokenized_datasets = train_subset.map(tokenize_function, batched=True)

def format_labels(example):
    example['labels'] = example['labels'][0] if len(example['labels']) > 0 else 0
    return example

tokenized_datasets = tokenized_datasets.map(format_labels)

training_args = TrainingArguments(
    output_dir="/home/fallen/Projects/Main_Project/research/fine_tuned_model",
    num_train_epochs=1,
    per_device_train_batch_size=8,
    use_cpu=True, # Force CPU for demo
    logging_steps=5,
    report_to="none"
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_datasets,
)

print("Starting mini fine-tuning (demo)...")
trainer.train()

model.save_pretrained("/home/fallen/Projects/Main_Project/research/fine_tuned_model")
tokenizer.save_pretrained("/home/fallen/Projects/Main_Project/research/fine_tuned_model")
print("Saved fine-tuned model!")

# %% [markdown]
# ### 4. Semantic Theme Extraction (Sentence-BERT)

# %%
from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans

sbert_model = SentenceTransformer('all-MiniLM-L6-v2')
journal_entries = [
    "I couldn't fall asleep last night",
    "Tossing and turning until 3am",
    "Felt really tired today",
    "Great workout at the gym",
    "Lifted heavy weights today",
    "Had a fight with my boss",
    "So stressed about work"
]

embeddings = sbert_model.encode(journal_entries)
kmeans = KMeans(n_clusters=3, random_state=42, n_init='auto').fit(embeddings)

print("\nSemantic Clustering Results:")
for text, cluster in zip(journal_entries, kmeans.labels_):
    print(f"Cluster {cluster}: {text}")
