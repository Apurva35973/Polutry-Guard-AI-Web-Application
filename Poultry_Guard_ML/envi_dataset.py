import argparse
import os
import numpy as np
import pandas as pd


# ============================================================
# BREED CONFIGURATION
# ============================================================

BREEDS = {
    "White Leghorn": {
        "egg_min": 85.0,
        "egg_max": 95.0,
        "feed_min": 100.0,
        "feed_max": 115.0,
    },

    "Rhode Island Red": {
        "egg_min": 70.0,
        "egg_max": 80.0,
        "feed_min": 120.0,
        "feed_max": 135.0,
    },

    "Broiler Ross 308": {
        "egg_min": 0.0,
        "egg_max": 0.0,
        "feed_min": 150.0,
        "feed_max": 175.0,
    }
}


# ============================================================
# DISEASE CONFIGURATION
# ============================================================

DISEASES = [
    "Healthy",
    "Fowl Pox",
    "Infectious Coryza"
]


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def random_uniform(rng, low, high, size):
    """
    Generate random floating-point values between low and high.
    """
    return rng.uniform(low, high, size)


def generate_breed_data(
    rng,
    breeds,
    size
):
    """
    Generate breed-specific baseline egg production
    and feed intake.
    """

    breed_array = rng.choice(
        breeds,
        size=size
    )

    egg_baseline = np.zeros(size)
    feed_baseline = np.zeros(size)

    for breed in breeds:

        mask = breed_array == breed

        count = mask.sum()

        if count == 0:
            continue

        config = BREEDS[breed]

        # Egg production
        if config["egg_min"] == 0:

            # Ross 308
            egg_baseline[mask] = 0.0

        else:

            egg_baseline[mask] = random_uniform(
                rng,
                config["egg_min"],
                config["egg_max"],
                count
            )

        # Feed intake
        feed_baseline[mask] = random_uniform(
            rng,
            config["feed_min"],
            config["feed_max"],
            count
        )

    return (
        breed_array,
        egg_baseline,
        feed_baseline
    )


# ============================================================
# HEALTHY DATA
# ============================================================

def generate_healthy(
    rng,
    size
):

    (
        breed,
        egg_baseline,
        feed_baseline
    ) = generate_breed_data(
        rng,
        list(BREEDS.keys()),
        size
    )

    # --------------------------------------------------------
    # Healthy thresholds
    # --------------------------------------------------------

    temperature = random_uniform(
        rng,
        18.0,
        24.0,
        size
    )

    humidity = random_uniform(
        rng,
        50.0,
        65.0,
        size
    )

    # < 15 ppm
    ammonia = random_uniform(
        rng,
        0.0,
        14.999,
        size
    )

    mortality = random_uniform(
        rng,
        0.1,
        1.5,
        size
    )

    # Healthy breed baseline
    egg_production = egg_baseline.copy()

    feed_intake = feed_baseline.copy()

    disease = np.full(
        size,
        "Healthy",
        dtype=object
    )

    return pd.DataFrame({
        "Breed": breed,
        "Temperature_C": temperature,
        "Humidity_percent": humidity,
        "Ammonia_ppm": ammonia,
        "Mortality_Rate_percent": mortality,
        "Egg_Production_percent": egg_production,
        "Amount_of_Feeding_g_bird_day": feed_intake,
        "Disease": disease
    })


# ============================================================
# FOWL POX DATA
# ============================================================

def generate_fowl_pox(
    rng,
    size
):

    (
        breed,
        egg_baseline,
        feed_baseline
    ) = generate_breed_data(
        rng,
        list(BREEDS.keys()),
        size
    )

    # --------------------------------------------------------
    # Fowl Pox thresholds
    # --------------------------------------------------------

    temperature = random_uniform(
        rng,
        26.0,
        36.0,
        size
    )

    humidity = random_uniform(
        rng,
        70.0,
        90.0,
        size
    )

    ammonia = random_uniform(
        rng,
        25.0,
        55.0,
        size
    )

    mortality = random_uniform(
        rng,
        10.0,
        55.0,
        size
    )

    # --------------------------------------------------------
    # Egg production:
    # 20% to 50% DROP from breed baseline
    # --------------------------------------------------------

    egg_drop = random_uniform(
        rng,
        0.20,
        0.50,
        size
    )

    egg_production = (
        egg_baseline *
        (1.0 - egg_drop)
    )

    # Ross 308 must always remain 0
    broiler_mask = (
        breed == "Broiler Ross 308"
    )

    egg_production[broiler_mask] = 0.0

    # --------------------------------------------------------
    # Feed intake:
    # 20% to 40% DROP
    # --------------------------------------------------------

    feed_drop = random_uniform(
        rng,
        0.20,
        0.40,
        size
    )

    feed_intake = (
        feed_baseline *
        (1.0 - feed_drop)
    )

    disease = np.full(
        size,
        "Fowl Pox",
        dtype=object
    )

    return pd.DataFrame({
        "Breed": breed,
        "Temperature_C": temperature,
        "Humidity_percent": humidity,
        "Ammonia_ppm": ammonia,
        "Mortality_Rate_percent": mortality,
        "Egg_Production_percent": egg_production,
        "Amount_of_Feeding_g_bird_day": feed_intake,
        "Disease": disease
    })


# ============================================================
# INFECTIOUS CORYZA DATA
# ============================================================

def generate_coryza(
    rng,
    size
):

    (
        breed,
        egg_baseline,
        feed_baseline
    ) = generate_breed_data(
        rng,
        list(BREEDS.keys()),
        size
    )

    # --------------------------------------------------------
    # Infectious Coryza thresholds
    # --------------------------------------------------------

    temperature = random_uniform(
        rng,
        10.0,
        18.0,
        size
    )

    humidity = random_uniform(
        rng,
        75.0,
        95.0,
        size
    )

    ammonia = random_uniform(
        rng,
        30.0,
        75.0,
        size
    )

    mortality = random_uniform(
        rng,
        2.0,
        20.0,
        size
    )

    # --------------------------------------------------------
    # Egg production:
    # 10% to 40% DROP from breed baseline
    # --------------------------------------------------------

    egg_drop = random_uniform(
        rng,
        0.10,
        0.40,
        size
    )

    egg_production = (
        egg_baseline *
        (1.0 - egg_drop)
    )

    # Ross 308 always remains 0
    broiler_mask = (
        breed == "Broiler Ross 308"
    )

    egg_production[broiler_mask] = 0.0

    # --------------------------------------------------------
    # Feed intake:
    # 10% to 30% DROP
    # --------------------------------------------------------

    feed_drop = random_uniform(
        rng,
        0.10,
        0.30,
        size
    )

    feed_intake = (
        feed_baseline *
        (1.0 - feed_drop)
    )

    disease = np.full(
        size,
        "Infectious Coryza",
        dtype=object
    )

    return pd.DataFrame({
        "Breed": breed,
        "Temperature_C": temperature,
        "Humidity_percent": humidity,
        "Ammonia_ppm": ammonia,
        "Mortality_Rate_percent": mortality,
        "Egg_Production_percent": egg_production,
        "Amount_of_Feeding_g_bird_day": feed_intake,
        "Disease": disease
    })


# ============================================================
# MAIN DATASET GENERATOR
# ============================================================

def generate_dataset(
    total_rows,
    output_file,
    seed=42
):

    rng = np.random.default_rng(seed)

    print("\n==============================================")
    print("POULTRY ENVIRONMENTAL SYNTHETIC DATA GENERATOR")
    print("==============================================")

    print(
        f"\nRequested rows: {total_rows:,}"
    )

    print(
        f"Random seed: {seed}"
    )

    # --------------------------------------------------------
    # Equal class distribution
    # --------------------------------------------------------

    base_size = total_rows // 3

    remainder = total_rows % 3

    healthy_size = base_size
    fowl_pox_size = base_size
    coryza_size = base_size

    if remainder >= 1:
        healthy_size += 1

    if remainder >= 2:
        fowl_pox_size += 1

    print("\nClass sizes:")

    print(
        f"Healthy          : {healthy_size:,}"
    )

    print(
        f"Fowl Pox         : {fowl_pox_size:,}"
    )

    print(
        f"Infectious Coryza: {coryza_size:,}"
    )

    # --------------------------------------------------------
    # Generate classes
    # --------------------------------------------------------

    print("\nGenerating Healthy data...")

    healthy_df = generate_healthy(
        rng,
        healthy_size
    )

    print("Generating Fowl Pox data...")

    fowl_pox_df = generate_fowl_pox(
        rng,
        fowl_pox_size
    )

    print("Generating Infectious Coryza data...")

    coryza_df = generate_coryza(
        rng,
        coryza_size
    )

    # --------------------------------------------------------
    # Combine
    # --------------------------------------------------------

    df = pd.concat(
        [
            healthy_df,
            fowl_pox_df,
            coryza_df
        ],
        ignore_index=True
    )

    # --------------------------------------------------------
    # Shuffle
    # --------------------------------------------------------

    df = df.sample(
        frac=1.0,
        random_state=seed
    ).reset_index(drop=True)

    # --------------------------------------------------------
    # Round numeric values
    # --------------------------------------------------------

    numeric_columns = [
        "Temperature_C",
        "Humidity_percent",
        "Ammonia_ppm",
        "Mortality_Rate_percent",
        "Egg_Production_percent",
        "Amount_of_Feeding_g_bird_day"
    ]

    df[numeric_columns] = df[
        numeric_columns
    ].round(3)

    # --------------------------------------------------------
    # Save
    # --------------------------------------------------------

    output_directory = os.path.dirname(
        output_file
    )

    if output_directory:
        os.makedirs(
            output_directory,
            exist_ok=True
        )

    print("\nSaving dataset...")

    df.to_csv(
        output_file,
        index=False
    )

    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    print("\n==============================================")
    print("DATASET GENERATED SUCCESSFULLY")
    print("==============================================")

    print(
        f"\nDataset shape: {df.shape}"
    )

    print("\nDisease distribution:")

    print(
        df["Disease"].value_counts()
    )

    print("\nBreed distribution:")

    print(
        df["Breed"].value_counts()
    )

    print("\nFirst 10 rows:")

    print(
        df.head(10).to_string(
            index=False
        )
    )

    print(
        f"\nSaved to:\n{output_file}"
    )


# ============================================================
# COMMAND-LINE INTERFACE
# ============================================================

def main():

    parser = argparse.ArgumentParser(
        description=(
            "Generate synthetic poultry "
            "environmental disease data"
        )
    )

    parser.add_argument(
        "--rows",
        type=int,
        required=True,
        help=(
            "Number of rows to generate "
            "(e.g. 100000, 500000, 1000000)"
        )
    )

    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Output CSV path"
    )

    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed"
    )

    args = parser.parse_args()

    if args.rows <= 0:

        raise ValueError(
            "Number of rows must be greater than 0."
        )

    # Default output filename
    if args.output is None:

        args.output = (
            f"poultry_coryza_"
            f"{args.rows}.csv"
        )

    generate_dataset(
        total_rows=args.rows,
        output_file=args.output,
        seed=args.seed
    )


if __name__ == "__main__":
    main()

