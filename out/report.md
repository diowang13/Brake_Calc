# Brake Calculation Report

## Brake Summary

- `FSB`: beta = 1.115 m/s^2
- `EB`: beta = 1.335 m/s^2
- `holding_brake`: beta = 0.557 m/s^2

## Load Summary

### AW0

| controller | mass_dynamic (ton) | spring_pressure (kPa) |
| --- | ---: | ---: |
| trailer_bogie_1 | 16.14 | 250 |
| trailer_bogie_2 | 16.14 | 250 |
| powered_bogie_3 | 17.4 | 212 |
| powered_bogie_4 | 17.4 | 212 |
| powered_bogie_5 | 17.4 | 212 |
| powered_bogie_6 | 17.4 | 212 |

### AW2

| controller | mass_dynamic (ton) | spring_pressure (kPa) |
| --- | ---: | ---: |
| trailer_bogie_1 | 23.04 | 401 |
| trailer_bogie_2 | 23.04 | 401 |
| powered_bogie_3 | 24.9 | 376 |
| powered_bogie_4 | 24.9 | 376 |
| powered_bogie_5 | 24.9 | 376 |
| powered_bogie_6 | 24.9 | 376 |

### AW3

| controller | mass_dynamic (ton) | spring_pressure (kPa) |
| --- | ---: | ---: |
| trailer_bogie_1 | 25.95 | 465 |
| trailer_bogie_2 | 25.95 | 465 |
| powered_bogie_3 | 27.97 | 443 |
| powered_bogie_4 | 27.97 | 443 |
| powered_bogie_5 | 27.97 | 443 |
| powered_bogie_6 | 27.97 | 443 |

## Pressure Standards

### AW0

#### EB

| controller | BCP (kPa) |
| --- | ---: |
| trailer_bogie_1 | 254 |
| trailer_bogie_2 | 254 |
| powered_bogie_3 | 273 |
| powered_bogie_4 | 273 |
| powered_bogie_5 | 273 |
| powered_bogie_6 | 273 |

#### FSB

| controller | BCP (kPa) |
| --- | ---: |
| trailer_bogie_1 | 226 |
| trailer_bogie_2 | 226 |
| powered_bogie_3 | 226 |
| powered_bogie_4 | 226 |
| powered_bogie_5 | 226 |
| powered_bogie_6 | 226 |

#### holding_brake

| controller | BCP (kPa) |
| --- | ---: |
| trailer_bogie_1 | 124 |
| trailer_bogie_2 | 124 |
| powered_bogie_3 | 124 |
| powered_bogie_4 | 124 |
| powered_bogie_5 | 124 |
| powered_bogie_6 | 124 |

### AW2

#### EB

| controller | BCP (kPa) |
| --- | ---: |
| trailer_bogie_1 | 353 |
| trailer_bogie_2 | 353 |
| powered_bogie_3 | 380 |
| powered_bogie_4 | 380 |
| powered_bogie_5 | 380 |
| powered_bogie_6 | 380 |

#### FSB

| controller | BCP (kPa) |
| --- | ---: |
| trailer_bogie_1 | 314 |
| trailer_bogie_2 | 314 |
| powered_bogie_3 | 314 |
| powered_bogie_4 | 314 |
| powered_bogie_5 | 314 |
| powered_bogie_6 | 314 |

#### holding_brake

| controller | BCP (kPa) |
| --- | ---: |
| trailer_bogie_1 | 168 |
| trailer_bogie_2 | 168 |
| powered_bogie_3 | 168 |
| powered_bogie_4 | 168 |
| powered_bogie_5 | 168 |
| powered_bogie_6 | 168 |

### AW3

#### EB

| controller | BCP (kPa) |
| --- | ---: |
| trailer_bogie_1 | 395 |
| trailer_bogie_2 | 395 |
| powered_bogie_3 | 424 |
| powered_bogie_4 | 424 |
| powered_bogie_5 | 424 |
| powered_bogie_6 | 424 |

#### FSB

| controller | BCP (kPa) |
| --- | ---: |
| trailer_bogie_1 | 350 |
| trailer_bogie_2 | 350 |
| powered_bogie_3 | 350 |
| powered_bogie_4 | 350 |
| powered_bogie_5 | 350 |
| powered_bogie_6 | 350 |

#### holding_brake

| controller | BCP (kPa) |
| --- | ---: |
| trailer_bogie_1 | 186 |
| trailer_bogie_2 | 186 |
| powered_bogie_3 | 186 |
| powered_bogie_4 | 186 |
| powered_bogie_5 | 186 |
| powered_bogie_6 | 186 |

## Theoretical Speed Checks

### FSB

| speed (km/h) | requirement_a_mean (m/s^2) | distance (m) | beta_used (m/s^2) |
| ---: | ---: | ---: | ---: |
| 20.0 | 0.764 | 20 | 1.115 |
| 40.0 | 0.907 | 68 | 1.115 |
| 60.0 | 0.967 | 144 | 1.115 |
| 80.0 | 1 | 247 | 1.115 |

### EB

| speed (km/h) | requirement_a_mean (m/s^2) | distance (m) | beta_used (m/s^2) |
| ---: | ---: | ---: | ---: |
| 20.0 | 0.932 | 17 | 1.335 |
| 40.0 | 1.097 | 56 | 1.335 |
| 60.0 | 1.167 | 119 | 1.335 |
| 80.0 | 1.204 | 205 | 1.335 |

## Controller Code Parameters

### Dynamic Mass Formula

- `powered_bogie`: `mass_dynamic_ton = 0.045766590389 * spring_pressure_kpa + 7.69298398169`
- `trailer_bogie`: `mass_dynamic_ton = 0.0456279069767 * spring_pressure_kpa + 4.73152325581`

### Pressure Conversion

| brake_type | load_group | controller | k_used | k_code | BCP0 | BCP0_code |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| FSB | AW0 | trailer_bogie_1 | 10.7619 | 1077 | 23 | 25 |
| FSB | AW0 | trailer_bogie_2 | 10.7619 | 1077 | 23 | 25 |
| FSB | AW0 | powered_bogie_3 | 10.7619 | 1077 | 23 | 25 |
| FSB | AW0 | powered_bogie_4 | 10.7619 | 1077 | 23 | 25 |
| FSB | AW0 | powered_bogie_5 | 10.7619 | 1077 | 23 | 25 |
| FSB | AW0 | powered_bogie_6 | 10.7619 | 1077 | 23 | 25 |
| FSB | AW2 | trailer_bogie_1 | 10.7619 | 1077 | 23 | 25 |
| FSB | AW2 | trailer_bogie_2 | 10.7619 | 1077 | 23 | 25 |
| FSB | AW2 | powered_bogie_3 | 10.7619 | 1077 | 23 | 25 |
| FSB | AW2 | powered_bogie_4 | 10.7619 | 1077 | 23 | 25 |
| FSB | AW2 | powered_bogie_5 | 10.7619 | 1077 | 23 | 25 |
| FSB | AW2 | powered_bogie_6 | 10.7619 | 1077 | 23 | 25 |
| FSB | AW3 | trailer_bogie_1 | 10.7619 | 1077 | 23 | 25 |
| FSB | AW3 | trailer_bogie_2 | 10.7619 | 1077 | 23 | 25 |
| FSB | AW3 | powered_bogie_3 | 10.7619 | 1077 | 23 | 25 |
| FSB | AW3 | powered_bogie_4 | 10.7619 | 1077 | 23 | 25 |
| FSB | AW3 | powered_bogie_5 | 10.7619 | 1077 | 23 | 25 |
| FSB | AW3 | powered_bogie_6 | 10.7619 | 1077 | 23 | 25 |
| EB | AW0 | trailer_bogie_1 | 10.7619 | 1077 | 23 | 25 |
| EB | AW0 | trailer_bogie_2 | 10.7619 | 1077 | 23 | 25 |
| EB | AW0 | powered_bogie_3 | 10.7619 | 1077 | 23 | 25 |
| EB | AW0 | powered_bogie_4 | 10.7619 | 1077 | 23 | 25 |
| EB | AW0 | powered_bogie_5 | 10.7619 | 1077 | 23 | 25 |
| EB | AW0 | powered_bogie_6 | 10.7619 | 1077 | 23 | 25 |
| EB | AW2 | trailer_bogie_1 | 10.7619 | 1077 | 23 | 25 |
| EB | AW2 | trailer_bogie_2 | 10.7619 | 1077 | 23 | 25 |
| EB | AW2 | powered_bogie_3 | 10.7619 | 1077 | 23 | 25 |
| EB | AW2 | powered_bogie_4 | 10.7619 | 1077 | 23 | 25 |
| EB | AW2 | powered_bogie_5 | 10.7619 | 1077 | 23 | 25 |
| EB | AW2 | powered_bogie_6 | 10.7619 | 1077 | 23 | 25 |
| EB | AW3 | trailer_bogie_1 | 10.7619 | 1077 | 23 | 25 |
| EB | AW3 | trailer_bogie_2 | 10.7619 | 1077 | 23 | 25 |
| EB | AW3 | powered_bogie_3 | 10.7619 | 1077 | 23 | 25 |
| EB | AW3 | powered_bogie_4 | 10.7619 | 1077 | 23 | 25 |
| EB | AW3 | powered_bogie_5 | 10.7619 | 1077 | 23 | 25 |
| EB | AW3 | powered_bogie_6 | 10.7619 | 1077 | 23 | 25 |
| holding_brake | AW0 | trailer_bogie_1 | 10.7619 | 1077 | 23 | 25 |
| holding_brake | AW0 | trailer_bogie_2 | 10.7619 | 1077 | 23 | 25 |
| holding_brake | AW0 | powered_bogie_3 | 10.7619 | 1077 | 23 | 25 |
| holding_brake | AW0 | powered_bogie_4 | 10.7619 | 1077 | 23 | 25 |
| holding_brake | AW0 | powered_bogie_5 | 10.7619 | 1077 | 23 | 25 |
| holding_brake | AW0 | powered_bogie_6 | 10.7619 | 1077 | 23 | 25 |
| holding_brake | AW2 | trailer_bogie_1 | 10.7619 | 1077 | 23 | 25 |
| holding_brake | AW2 | trailer_bogie_2 | 10.7619 | 1077 | 23 | 25 |
| holding_brake | AW2 | powered_bogie_3 | 10.7619 | 1077 | 23 | 25 |
| holding_brake | AW2 | powered_bogie_4 | 10.7619 | 1077 | 23 | 25 |
| holding_brake | AW2 | powered_bogie_5 | 10.7619 | 1077 | 23 | 25 |
| holding_brake | AW2 | powered_bogie_6 | 10.7619 | 1077 | 23 | 25 |
| holding_brake | AW3 | trailer_bogie_1 | 10.7619 | 1077 | 23 | 25 |
| holding_brake | AW3 | trailer_bogie_2 | 10.7619 | 1077 | 23 | 25 |
| holding_brake | AW3 | powered_bogie_3 | 10.7619 | 1077 | 23 | 25 |
| holding_brake | AW3 | powered_bogie_4 | 10.7619 | 1077 | 23 | 25 |
| holding_brake | AW3 | powered_bogie_5 | 10.7619 | 1077 | 23 | 25 |
| holding_brake | AW3 | powered_bogie_6 | 10.7619 | 1077 | 23 | 25 |
