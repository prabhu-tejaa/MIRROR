# Mirror Authentication Subsystem (auth-service)
## Technical Reference & Developer Guide (A to Z Architecture & Class Specifications)

Welcome to the definitive **Mirror Authentication Subsystem (`auth-service`) Developer Reference**. This document is designed for system architects, security auditors, and onboarding engineers. It provides a detailed, conceptual, and structural blueprint of Mirror's security layer—detailing the dynamic network topology, package layout, database mappings, method signatures, validation lifecycles, and API Gateway mappings without copy-pasting raw source code listings.

---

## 1. Architectural View & Network Topology

The authentication layer is the gatekeeper of Mirror’s distributed backend services. To keep the deployment highly efficient, flexible, and robust, the network topology adapts dynamically based on the active Spring profile (**Local Development** vs. **Production**).

### Dual-Environment Execution Modes

```
+-----------------------------------------------------------------------------------+
|                                 1. LOCAL DEVELOPMENT                              |
|                                                                                   |
|  [Ionic Client (:8100)] ──► [API Gateway (:8060)] ──► [Eureka Registry (:8761)]   |
|                                     │ (Dynamic lb://)                             |
|                                     ▼                                             |
|                             [Auth Service (:8080)]                                |
+-----------------------------------------------------------------------------------+
|                                 2. PRODUCTION                                     |
|                                                                                   |
|  [Ionic Client (Prod)] ───► [API Gateway (Prod)] ─────────────────────────────────┐
|                                     │ (Direct URL static routing)                 │
|                                     ▼                                             │
|                             [Auth Service (Prod)]                                 │
|                        (Eureka discovery is bypassed)                             │
+-----------------------------------------------------------------------------------+
```

#### A. Local Development Mode (`default` Profile)
* **Discovery Enabled**: The **Netflix Eureka Discovery Server** (`discovery-server`) runs on port `8761`. 
* **Dynamic Registration**: Both the `api-gateway` and `auth-service` register themselves automatically as clients on startup.
* **Gateway Routing**: The gateway uses logical, load-balanced route targets (`lb://auth-service`), querying Eureka dynamically to resolve physical service instances (ideal for local testing and multi-instance scaling).

#### B. Production Mode (`prod` Profile)
* **Eureka Bypassed**: **Eureka discovery is entirely disabled**. There is no Discovery Server running in the production cluster.
* **Direct Routing**: The gateway routes traffic directly to the physical URL of the target microservice using environment variables injected at runtime (e.g., routing `/api/auth/**` directly to the `AUTH_SERVICE_URL` variable).
* **Lightweight Profile**: Only two active backend microservices are used—the `api-gateway` and the `auth-service`. This significantly reduces deployment complexity, latency, and resource costs.

---

## 2. API Gateway Integration & Routing Specifications

The gateway plays an integral role in exposing and protecting the authentication endpoints. Below are the exact configuration schemas comparing the environments:

### A. Route & CORS Configurations

Depending on the active profile, the gateway routes are configured differently to support dynamic registration locally or static DNS routing in production:

#### 1. Local Development Setup (Default Profile)
* **Route Target**: Logical service identifier `lb://auth-service`.
* **Dynamic Registration**: Interacts with the Eureka Discovery Server for automatic client routing.
* **Path Prefix**: Catches all requests targeting `/api/auth/**`.

#### 2. Production Setup (`prod` Profile)
* **Route Target**: Static URL resolved from the environment variable `${AUTH_SERVICE_URL}`.
* **Eureka Status**: Completely disabled (`eureka.client.enabled = false`), avoiding service polling.
* **Path Prefix**: Catches all requests targeting `/api/auth/**`.

#### 3. Global CORS Settings
The gateway serves as the outer boundary, shielding downstream services. It is explicitly pre-configured to allow Capacitor/Ionic clients to bypass browser CORS validation:
* **Allowed Origins**: `http://localhost:8100`, `http://192.168.1.101:8100`, `capacitor://localhost`.
* **Allowed Methods**: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`.
* **Credential Sharing**: Disabled to maintain security isolation.

### B. Gateway Security Bypass (`GatewaySecurityConfig.java`)
The gateway runs on Spring WebFlux Security. It permits all traffic targeting the authentication route through the gateway, delegating explicit verification logic to the auth microservice itself:
* **Cross-Site Request Forgery (CSRF)**: Disabled globally since microservice communication is stateless and relies on JSON Web Tokens (JWTs).
* **Authorization Rules**: `permitAll()` is enforced on all paths matching the gateway routing patterns, ensuring public routes (signup, login, OTP recovery) are accessible.

---

## 3. Directory Layout & Package Blueprint

Below is the package layout of the authentication microservice source code located under `backend/auth-service/src/main/java/com/mirror/authservice`:

```
com/mirror/authservice/
├── AuthServiceApplication.java         # Microservice Bootstrap class
├── controller/
│   └── AuthController.java             # REST Controller exposing endpoints
├── dto/
│   ├── AuthResponse.java               # Output DTO containing token payload
│   ├── LoginRequest.java               # Input DTO for logins
│   └── RegisterRequest.java            # Input DTO for registrations
├── model/
│   ├── OtpToken.java                   # JPA entity representing OTP tokens
│   ├── RefreshToken.java               # JPA entity representing active refresh sessions
│   ├── Role.java                       # Enumeration of application privileges
│   └── User.java                       # JPA entity representing system users
├── repository/
│   ├── OtpTokenRepository.java         # Data Access Layer for OTP operations
│   ├── RefreshTokenRepository.java     # Data Access Layer for Refresh tokens
│   └── UserRepository.java             # Data Access Layer for User profiles
├── security/
│   ├── JwtUtil.java                    # JWT building, validation, and parsing
│   └── SecurityConfig.java             # Spring Web Security filter configurations
└── service/
   ## 4. File-by-File Technical Breakdown & Class Specifications

This section provides a granular, file-by-file technical reference manual for every component in the `auth-service`. Each class, repository, data contract (DTO), and method is documented with its signature, functional purpose, internal execution steps, chronological logical flow, and "Side of Caution" security and reliability safeguards.

---

### A. Bootstrapping & Privilege Configuration

#### 1. `AuthServiceApplication.java`
* **Path**: `com.mirror.authservice.AuthServiceApplication`
* **Role**: The main bootstrap class that initializes the Spring Boot application context, performs component scanning, and triggers registration with the Eureka Server (if the local default profile is active).
* **Annotations**:
  * `@SpringBootApplication`: Meta-annotation combining `@Configuration` (defines bean factories), `@EnableAutoConfiguration` (toggles Spring's classpath-based auto-setup), and `@ComponentScan` (recursively searches the current package for stereotypic components like services and controllers).

##### Method: `main(String[] args)`
* **Signature**: `public static void main(String[] args)`
* **Core Purpose**: Programmatic entry point for the Java Virtual Machine (JVM) to boot the authentication microservice.
* **Internal Execution Flow**:
  1. The JVM invokes `main` on startup.
  2. Calls `SpringApplication.run(AuthServiceApplication.class, args)`.
  3. Spring Boot boots the Embedded Tomcat Web Server (configured to run on port `8080`).
  4. Scans and registers beans, establishes database connections via JDBC/JPA, and activates Spring Cloud routing integration.
* **"Side of Caution" Safeguards**:
  * **Failure Analysis**: If port `8080` is occupied, Spring Boot shuts down gracefully, throwing a clear `PortInUseException`.
  * **Environment Bounds**: If critical environment variables (like `DB_URL` or `MAIL_USERNAME`) are missing, connection pools will fail to initialize, triggering an application crash on startup rather than running in a broken state.

---

#### 2. `model/Role.java`
* **Path**: `com.mirror.authservice.model.Role`
* **Role**: Defines the exact security privileges and authorization scopes available within the Mirror ecosystem.
* **Enum Constants**:
  * `ROLE_USER`: Standard customer/user access. Granted read/write permissions for personal data and memory modules.
  * `ROLE_ADMIN`: Systems Administrator access. Granted sweeping rights across accounts, databases, and configuration settings.
* **"Side of Caution" Safeguards**:
  * **Prefix Enforcements**: The prefix `ROLE_` is mandatory to align perfectly with Spring Security's default role-based authorization checks (`hasRole("USER")` searches for `ROLE_USER` under the hood).
  * **Immutability**: Enums are inherently immutable and compiled, preventing dynamic privilege insertion attacks at runtime.

---

### B. Persistent Database Schemas (JPA Entities)

#### 1. `model/User.java`
* **Path**: `com.mirror.authservice.model.User`
* **Role**: Mapped JPA entity for the `users` database table. Stores profiles, password credentials, verification statuses, and brute force tracking metrics.
* **Annotations**:
  * `@Entity`: Marks this class as an active JPA/Hibernate table mapping.
  * `@Table(name = "users")`: Specifies target SQL database table.
  * `@Data`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`: Lombok annotations generating getters/setters, default/parameterized constructors, and the fluent builder pattern.
* **Field-Level Safety Specifications**:
  * `id` (`UUID`): Primary Key. Automatically generated using a secure UUID generator. Prevents resource enumeration attacks (e.g. guessing auto-incrementing IDs like `/api/users/1`, `/api/users/2`).
  * `username` (`String`): Length capped at 50, unique index. Must be non-null.
  * `email` (`String`): Length capped at 100, unique index. Primary communications channel.
  * `passwordHash` (`String`): Cored via `@Column(name = "password_hash")`. Stores secure BCrypt-encoded strings; never stores plain text.
  * `role` (`Role`): Privileges enum mapped as a string column to prevent numerical order shifting in updates.
  * `isVerified` (`boolean`): Activation flag mapping OTP authentication completion.
  * `failedAttempts` (`int`): Tracked integer for brute-force lock calculations. Defaults to `0`.
  * `lockedUntil` (`LocalDateTime`): Absolute time threshold after which a brute-force lock expires.
  * `createdAt` / `updatedAt` (`LocalDateTime`): Auditing timestamps for database integrity.

##### Lifecycle Method: `onCreate()`
* **Signature**: `@PrePersist protected void onCreate()`
* **Core Purpose**: Automatically records auditing creation timestamps.
* **Internal Execution Flow**: Triggers automatically before SQL `INSERT` is executed. Sets `createdAt` and `updatedAt` to `LocalDateTime.now()`.
* **"Side of Caution" Safeguards**: Immutability of creation records. `createdAt` is explicitly configured with `updatable = false` at the column level to prevent subsequent updates from corrupting historical creation logs.

##### Lifecycle Method: `onUpdate()`
* **Signature**: `@PreUpdate protected void onUpdate()`
* **Core Purpose**: Automatically records auditing modification timestamps.
* **Internal Execution Flow**: Triggers automatically before SQL `UPDATE` is executed. Sets `updatedAt` to `LocalDateTime.now()`.
* **"Side of Caution" Safeguards**: Done on the database transaction thread, ensuring precise, un-spoofable auditing timestamps regardless of local application server drifting.

---

#### 2. `model/RefreshToken.java`
* **Path**: `com.mirror.authservice.model.RefreshToken`
* **Role**: Mapped JPA entity for the `refresh_tokens` database table. Persists high-entropy UUID strings associated with active user sessions to facilitate JWT silent-refresh.
* **Annotations**: `@Entity`, `@Table(name = "refresh_tokens")`, Lombok annotations.
* **Field-Level Safety Specifications**:
  * `id` (`UUID`): Primary Key. Unique session ID.
  * `user` (`User`): Mapped via `@ManyToOne` association linking back to the user identity.
  * `token` (`String`): Unique high-entropy string (UUIDv4) stored as an index column.
  * `expiresAt` (`LocalDateTime`): Absolute token expiration limit (set to exactly 7 days).
  * `createdAt` (`LocalDateTime`): Auditing field.

##### Mapped Association: `user`
* **Signature**: `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false) private User user;`
* **Why it is designed this way**:
  * **Performance Guard (LAZY Fetching)**: Using lazy-loading is a critical safeguard. When looking up a refresh token to validate it, Hibernate does *not* load the entire `User` object, preventing expensive N+1 SQL joins. The user entity is only fetched if explicitly requested.
  * **Referential Integrity**: Configured as `nullable = false` which generates an SQL foreign key constraint on the database level, ensuring orphaned refresh tokens cannot exist.

##### Lifecycle Method: `onCreate()`
* **Signature**: `@PrePersist protected void onCreate()`
* **Core Purpose**: Automatically registers session initiation timestamps before database insertion.

---

#### 3. `model/OtpToken.java`
* **Path**: `com.mirror.authservice.model.OtpToken`
* **Role**: Mapped JPA entity for the `otp_tokens` database table. Stores verification and password-recovery keys.
* **Annotations**: `@Entity`, `@Table(name = "otp_tokens")`, Lombok annotations.
* **Field-Level Safety Specifications**:
  * `id` (`UUID`): Primary Key. Unique record identifier.
  * `user` (`User`): Lazy-loaded `@ManyToOne` mapping to the target user account.
  * `hashedOtp` (`String`): SHA-256 cryptographic hash of the 6-digit verification code. Coded securely; the plain text is never persisted.
  * `expiresAt` (`LocalDateTime`): Expiry timestamp (always set to exactly 5 minutes from creation).
  * `used` (`boolean`): Replay protection state. Defaults to `false`.

##### Method: `isExpired()`
* **Signature**: `public boolean isExpired()`
* **Core Purpose**: Performs structural validation comparing the current server time to the token's lifetime bounds.
* **Internal Execution Flow**: Returns `true` if `LocalDateTime.now()` is chronologically after the `expiresAt` value.
* **"Side of Caution" Safeguards**:
  * **Timezone Safety**: Utilizes Java's system-default clock. Application servers and database servers *must* synchronize time via Network Time Protocol (NTP) to prevent edge cases where codes appear pre-expired or extended due to clock-skew.

---

### C. Data Transfer Objects (DTO Records)

To enforce absolute data immutability, all API request and response models are built using **Java Records**. Records auto-generate constructors, `equals()`, `hashCode()`, and getter accessors under the hood, guaranteeing thread-safe, read-only data transfer.

#### 1. `dto/RegisterRequest.java`
* **Path**: `com.mirror.authservice.dto.RegisterRequest`
* **Role**: Data contract for registration input payloads.
* **Signature**: `public record RegisterRequest(String username, String email, String password)`
* **"Side of Caution" Safeguards**: Since this is a record, its values are final (`final`). This blocks request interceptors or malicious threads from mutating parameters during processing.

#### 2. `dto/LoginRequest.java`
* **Path**: `com.mirror.authservice.dto.LoginRequest`
* **Role**: Data contract for login input payloads.
* **Signature**: `public record LoginRequest(String email, String password)`

#### 3. `dto/AuthResponse.java`
* **Path**: `com.mirror.authservice.dto.AuthResponse`
* **Role**: Unified payload returned on successful login or refresh cycles.
* **Fields**:
  * `accessToken` (`String`): Signed, transient JWT.
  * `refreshToken` (`String`): High-entropy UUID string representing the persistent session.
  * `username` (`String`): Mapped username handle for instant client display.

---

### D. Data Access Layers (Spring Data JPA Repositories)

All database interfaces inherit from `JpaRepository`, exposing secure CRUD operations and executing clean parameterized SQL queries to automatically neutralize SQL injection vulnerabilities.

#### 1. `repository/UserRepository.java`
* **Path**: `com.mirror.authservice.repository.UserRepository`
* **Role**: Interacts with the `users` table.
* **Methods**:
  * `Optional<User> findByEmail(String email)`
    * **Purpose**: Fetches a user profile by email during login, recovery, or OTP checks.
    * **Safeguard**: Returns `Optional`. This forces developers to handle the empty/absent state explicitly, completely eliminating `NullPointerException` crashes during lookups.
  * `Optional<User> findByUsername(String username)`
    * **Purpose**: Fetches a profile by username. Returns `Optional` to safely handle non-existent users.
  * `boolean existsByUsername(String username)`
    * **Purpose**: Verifies username uniqueness before registering.
    * **Safeguard**: Executes an extremely lightweight, high-performance boolean existential query (`EXISTS`). This is a critical database performance optimization, avoiding loading the entire user entity payload over the network just to check if a name is taken.
  * `boolean existsByEmail(String email)`
    * **Purpose**: Verifies email uniqueness before registering. Evaluates via an optimized `EXISTS` database query.

---

#### 2. `repository/RefreshTokenRepository.java`
* **Path**: `com.mirror.authservice.repository.RefreshTokenRepository`
* **Role**: Interacts with the `refresh_tokens` table.
* **Methods**:
  * `Optional<RefreshToken> findByToken(String token)`
    * **Purpose**: Looks up active refresh sessions by UUID string. Returns `Optional` to cleanly handle invalid/forged tokens.
  * `void deleteByToken(String token)`
    * **Purpose**: Permanently deletes a refresh session.
    * **Safeguard**: Invoked during logouts. Must be annotated or wrapped in a transaction to successfully commit deletions.

---

#### 3. `repository/OtpTokenRepository.java`
* **Path**: `com.mirror.authservice.repository.OtpTokenRepository`
* **Role**: Interacts with the `otp_tokens` table.
* **Methods**:
  * `Optional<OtpToken> findTopByUserAndUsedFalseOrderByExpiresAtDesc(User user)`
    * **Purpose**: Retrieves the single latest active, unused OTP issued to a specific user.
    * **Internal SQL Flow**: Translates under the hood to:
      `SELECT * FROM otp_tokens WHERE user_id = ? AND used = false ORDER BY expires_at DESC LIMIT 1;`
    * **Why it is designed this way (Chronological Enforcements)**:
      * By sorting by expiration time in descending order and selecting only the top result, it ensures that *only* the most recently generated code is verified. 
      * If a user requests multiple OTPs rapidly, older tokens are ignored, preventing race conditions or replay attacks utilizing stale codes.

---

### E. Security & Cryptography Utilities

#### 1. `security/JwtUtil.java`
* **Path**: `com.mirror.authservice.security.JwtUtil`
* **Role**: Central manager for building, validating, and parsing JSON Web Tokens.
* **Static Configuration Fields**:
  * `SECRET_KEY` (`Key`): Signed key initialized using `Keys.secretKeyFor(SignatureAlgorithm.HS256)`.
    * **Design & Trade-off (Dynamic startup keys)**:
      * **How it works**: The key is dynamically generated in-memory during container startup. It is never written in config files or environment variables.
      * **Why it is designed this way**: Extremely secure. If a hacker steals the repository, they get no keys.
      * **Side of Caution**: Because the signature key is dynamic, if the authentication microservice restarts or scales down, all outstanding user access JWTs are instantly invalidated. This requires clients to seamlessly exchange their persistent database-stored refresh tokens for a new JWT without forcing the user to log in again.
  * `ACCESS_TOKEN_EXPIRATION` (`long`): Set to **15 minutes** (`1000 * 60 * 15` milliseconds). Enforces strict transient access lifetimes.

##### Method: `generateAccessToken(User user)`
* **Signature**: `public String generateAccessToken(User user)`
* **Core Purpose**: Assembles a stateless JWT credential packed with user metadata for authorization checks across microservices.
* **Internal Step-by-Step Execution Flow**:
  1. Instantiates a `HashMap<String, Object>` called `claims`.
  2. Injects the user's role mapping: `claims.put("role", user.getRole().name())`.
  3. Injects the user's email: `claims.put("email", user.getEmail())`.
  4. Initiates the builder: `Jwts.builder()`.
  5. Binds custom claims, sets the subject to `user.getUsername()`, sets the issuance timestamp to `new Date()`, and sets the expiration bounds to `new Date(currentTime + 15 mins)`.
  6. Sign with the HMAC-SHA256 algorithm using the transient, dynamic `SECRET_KEY`.
  7. Invokes `compact()` to serialize the token into a URL-safe Base64-encoded string and returns it.
* **Logical Execution Flow**:
  ```
  User Profile ──► Assemble Claims (Email, Role) ──► Apply Timestamps ──► Sign with Secret Key ──► URL-Safe Base64 String
  ```
* **"Side of Caution" Safeguards**:
  * **Least Privilege Principle**: Never put sensitive values (like passwords, password hashes, or OTP codes) into JWT claims. JWT payloads are only Base64-encoded, not encrypted, meaning any client can decode them. Custom claims are strictly limited to non-sensitive authorization flags (Role, Email).

##### Method: `extractAllClaims(String token)`
* **Signature**: `private Claims extractAllClaims(String token)`
* **Core Purpose**: Decodes a token and extracts the packed claims payload, validating the token signature in the process.
* **Internal Step-by-Step Execution Flow**:
  1. Initializes the JWT parser: `Jwts.parserBuilder()`.
  2. Binds the active `SECRET_KEY` to the parser context.
  3. Invokes `parseClaimsJws(token)` to process the incoming token.
  4. Extracts and returns the claims body via `getBody()`.
* **"Side of Caution" Safeguards & Exception Vectors**:
  * This is the core gatekeeper of token verification. If a client attempts to forge, manipulate, or intercept and modify a token claim, `parseClaimsJws()` will instantly throw a cryptographic exception (`SignatureException` or `MalformedJwtException`), halting execution.
  * If the token has passed its expiration time, it throws an `ExpiredJwtException`.
  * All these exceptions are caught globally, preventing untrusted claims from being processed by downstream resources.

##### Method: `extractClaim(String token, Function<Claims, T> claimsResolver)`
* **Signature**: `public <T> T extractClaim(String token, Function<Claims, T> claimsResolver)`
* **Core Purpose**: Decouples claims extraction by applying a functional mapping resolver to raw decoded claims.
* **Internal Step-by-Step Execution Flow**:
  1. Invokes `extractAllClaims(token)` to parse the token payload securely.
  2. Applies the passed functional resolver (e.g. `Claims::getSubject` or `Claims::getExpiration`) to retrieve the targeted claim.
  3. Returns the typed value (`T`).

##### Method: `extractUsername(String token)`
* **Signature**: `public String extractUsername(String token)`
* **Core Purpose**: Extracts the username subject claim from the token.
* **Internal Step-by-Step Execution Flow**: Calls `extractClaim(token, Claims::getSubject)` to return the subject string.

##### Method: `extractExpiration(String token)`
* **Signature**: `public Date extractExpiration(String token)`
* **Core Purpose**: Extracts the expiration timestamp claim from the token.
* **Internal Step-by-Step Execution Flow**: Calls `extractClaim(token, Claims::getExpiration)`.

##### Method: `isTokenExpired(String token)`
* **Signature**: `private boolean isTokenExpired(String token)`
* **Core Purpose**: Determines if the token is past its validation lifetime.
* **Internal Step-by-Step Execution Flow**: Checks if `extractExpiration(token)` is before the current timestamp `new Date()`. Returns `true` if expired.

##### Method: `validateToken(String token, String username)`
* **Signature**: `public boolean validateToken(String token, String username)`
* **Core Purpose**: Formally verifies token validity by matching the subject against the expected user.
* **Internal Step-by-Step Execution Flow**:
  1. Extracts the token's subject: `final String extractedUsername = extractUsername(token)`.
  2. Evaluates expiration: `!isTokenExpired(token)`.
  3. Returns `true` if the extracted username strictly matches the `username` parameter and the token is not expired. Otherwise, returns `false`.

---

#### 2. `security/SecurityConfig.java`
* **Path**: `com.mirror.authservice.security.SecurityConfig`
* **Role**: Configures the local web application security bounds for the microservice.
* **Annotations**:
  * `@Configuration`: Defines this class as a source of Spring bean definitions.
  * `@EnableWebSecurity`: Activates Spring Security’s web-based authorization filter engines.

##### Method: `passwordEncoder()`
* **Signature**: `@Bean public PasswordEncoder passwordEncoder()`
* **Core Purpose**: Registers the central password encryption algorithm.
* **Internal Step-by-Step Execution Flow**: Instantiates and returns a new `BCryptPasswordEncoder` bean.
* **"Side of Caution" Safeguards**:
  * **Adaptive Hardness & Salting**: BCrypt dynamically generates a unique salt for every hash under the hood. Salt strings do *not* need to be stored separately, as they are embedded directly in the output hash. 
  * BCrypt is computationally slow by design, resisting GPU-based offline dictionary attacks.

##### Method: `securityFilterChain(HttpSecurity http)`
* **Signature**: `@Bean public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception`
* **Core Purpose**: Outlines the security filter rules to intercept, permit, or block incoming HTTP requests targeting the authentication service.
* **Internal Step-by-Step Execution Flow**:
  1. **Disable CSRF**: `csrf(csrf -> csrf.disable())`.
     * *Why this is safe*: Stateless REST services authenticating via JWT headers are immune to Cross-Site Request Forgery (CSRF) attacks since browsers do not automatically attach auth headers like they do with cookies.
  2. **Route Authorization rules**:
     * Access paths matching `/api/auth/**`, `/auth/**`, and `/error` are set to `permitAll()` so public routes (sign up, log in, OTP dispatch, refresh) are exposed.
     * Mandates authentication on all other incoming paths: `anyRequest().authenticated()`.
  3. Invokes `build()` to assemble and return the Spring security filter chain.

---

### F. Communication & Messaging Services

#### 1. `service/EmailService.java`
* **Path**: `com.mirror.authservice.service.EmailService`
* **Role**: Constructs and transmits text notifications using SMTP.
* **Annotations**: `@Service`, `@RequiredArgsConstructor`.
* **Private Configuration Fields**:
  * `mailSender` (`JavaMailSender`): Core Spring wrapper managing SMTP connections.
  * `fromEmail` (`String`): Injected from properties via `@Value("${app.mail.from}")`.

##### Method: `sendOtpEmail(String to, String otp, String username, String type)`
* **Signature**: `public void sendOtpEmail(String to, String otp, String username, String type)`
* **Core Purpose**: Assembles and sends plain-text emails containing security codes.
* **Internal Step-by-Step Execution Flow**:
  1. Instantiates a `SimpleMailMessage` container.
  2. Sets sender metadata (`setFrom(fromEmail)`) and the target recipient address (`setTo(to)`).
  3. Evaluates the template trigger string `type` using a case-insensitive check:
     * **If `"RESET"`**: Sets the subject to `"Reset Your Mirror Password"`. Constructs a formal, highly security-conscious body containing password warnings and the plain-text OTP code.
     * **If anything else (e.g. `"VERIFY"`)**: Sets the subject to `"Your Mirror Verification Code"`. Formulates a welcoming body decorated with emojis (`✧‿✧･ﾟ`) and the plain-text verification code.
  4. Invokes `mailSender.send(message)` to initiate the SMTP socket connection and dispatch the email.
* **"Side of Caution" Safeguards**:
  * **Asynchronous Isolation**: SMTP operations are network-intensive. In a production cluster, if the connection to Google's SMTP servers lags, this blocking call will hold up the thread. In future scaling steps, this should be annotated with `@Async` to execute mail dispatch in the background, freeing the web server thread instantly.
  * **Strict Template Logic**: All templates are plain-text. This avoids HTML injection vulnerabilities where malicious entities could inject script tags into dynamic email inputs.

---

### G. Cryptographic Lifecycle Services

#### 1. `service/OtpService.java`
* **Path**: `com.mirror.authservice.service.OtpService`
* **Role**: Cryptographically handles code generation, database hashing, replay protection, and verification lifecycle.
* **Annotations**: `@Service`, `@RequiredArgsConstructor`.

##### Method: `generateOtp(String email)`
* **Signature**: `public String generateOtp(String email)`
* **Core Purpose**: Generates a raw verification code, commits its cryptographically hashed representation to SQL storage for safety, and returns the raw string for mail dispatch.
* **Internal Step-by-Step Execution Flow**:
  1. Queries the database: `userRepository.findByEmail(email)`. If the user does not exist, immediately throws a `RuntimeException("User not found")`.
  2. Generates a random 6-digit numeric string: `String.format("%06d", new Random().nextInt(1000000))`.
  3. Hashes the raw 6-digit code via SHA-256: `DigestUtils.sha256Hex(rawCode)`.
  4. Builds a new `OtpToken` record linking to the user entity, setting the hashed OTP string, setting `expiresAt` to exactly **5 minutes** from now, and setting the replay flag `used = false`.
  5. Saves the token: `otpRepository.save(otp)`.
  6. Returns the **unhashed, raw 6-digit code** string.
* **Logical Execution Flow**:
  ```
  Check User Existence ──► Generate Raw Code ──► Hash with SHA-256 ──► Commit Hash to DB ──► Return Raw Code
  ```
* **"Side of Caution" Safeguards**:
  * **Cryptographic Isolation**: The database *never* sees or stores the plain-text OTP code. This is an extreme safety precaution. If an attacker gains full read access to the database (via SQL injection or a database dump leak), they only see SHA-256 hashes. Because SHA-256 is a one-way cryptographic function, they cannot reverse the hashes to extract the active verification code. The raw code is transiently held in-memory and sent straight to the user via SMTP.

##### Method: `verifyOtp(User user, String rawCode)`
* **Signature**: `public boolean verifyOtp(User user, String rawCode)`
* **Core Purpose**: Performs safe validation of user-submitted codes.
* **Internal Step-by-Step Execution Flow**:
  1. Queries the database for the newest unused OTP issued to the user: `otpRepository.findTopByUserAndUsedFalseOrderByExpiresAtDesc(user)`.
  2. If a record is found, checks that it is not expired: `!otp.isExpired()`.
  3. Hashes the incoming `rawCode` via SHA-256 and compares it against the persisted `hashedOtp` hash string.
  4. If all validations match, marks the record as used: `otp.setUsed(true)`.
  5. Persists the modified record to database: `otpRepository.save(otp)` and returns `true`.
  6. If any step fails (missing record, expired code, hash mismatch), returns `false`.
* **Logical Execution Flow**:
  ```
  Lookup Newest Unused OTP ──► Validate Expiry ──► Match SHA-256 Hash ──► Mark Used = True ──► Save and Return Result
  ```
* **"Side of Caution" Safeguards & Replay Protections**:
  * **Replay Attack Blocker**: Immediately after successful comparison, `otp.setUsed(true)` is committed to the database. This guarantees that an OTP code is **strictly single-use**. Even if the code's 5-minute lifespan has not expired, any subsequent attempts to reuse it will fail, completely neutralizing intercept-and-replay attacks.
  * **Fast Expiry**: The 5-minute lifespan restricts the vulnerability window.

---

### H. Transactional Orchestration Layer

#### 1. `service/AuthService.java`
* **Path**: `com.mirror.authservice.service.AuthService`
* **Role**: Primary manager coordinating transactions, validations, brute-force security lockout metrics, and session lifecycles.
* **Annotations**: `@Service`, `@RequiredArgsConstructor`.

##### Method: `registerUser(String username, String email, String rawPassword)`
* **Signature**: `public User registerUser(String username, String email, String rawPassword)`
* **Core Purpose**: Creates a brand new standard user profile in the SQL database.
* **Internal Step-by-Step Execution Flow**:
  1. Checks if the email is taken: `userRepository.existsByEmail(email)`. If so, throws a `RuntimeException`.
  2. Checks if the username is taken: `userRepository.existsByUsername(username)`. If so, throws a `RuntimeException`.
  3. Encrypts the raw password: `passwordEncoder.encode(rawPassword)`.
  4. Constructs a `User` entity, setting the role to `Role.ROLE_USER` and binding the encrypted password hash.
  5. Saves and returns the registered `User` profile: `userRepository.save(newUser)`.
* **Logical Execution Flow**:
  ```
  Check Email/Username Taken ──► Encode Password with BCrypt ──► Assemble User Entity ──► Persist and Return
  ```
* **"Side of Caution" Safeguards**:
  * **Work Factor CPU Protections**: The existence checks are executed *first*, before calling `passwordEncoder.encode()`. This is an intentional security design choice. Since BCrypt is highly CPU-intensive by design, putting existence checks first ensures that if a malicious script tries to register duplicate emails to exhaust server CPU cycles, the execution aborts early without running the expensive password hashing algorithm.

##### Method: `loginUser(String email, String rawPassword)`
* **Signature**: `public User loginUser(String email, String rawPassword)`
* **Core Purpose**: Validates credentials and handles brute-force protection logic.
* **Internal Step-by-Step Execution Flow**:
  1. Queries the database by email: `userRepository.findByEmail(email)`. Throws a generic `"Invalid email or password!"` error if missing (avoids identifying if the email is registered or not to block user-enumeration).
  2. **Brute Force Lockout Check**: Checks if the user is locked:
     `if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now()))`
     If so, immediately throws a `"Account is locked. Try again later."` exception, halting execution.
  3. **Password Verification**:
     Checks the password via `passwordEncoder.matches(rawPassword, user.getPasswordHash())`.
     * **If Mismatch**:
       1. Increments failed attempts counter by 1: `user.setFailedAttempts(attempts + 1)`.
       2. If `failedAttempts` reaches or exceeds **5**, sets the lockout timer: `user.setLockedUntil(LocalDateTime.now().plusMinutes(15))`.
       3. Saves the updated user state: `userRepository.save(user)`.
       4. Throws a `RuntimeException("Invalid email or password!")`.
     * **If Match**:
       1. Resets security metrics: `user.setFailedAttempts(0)` and `user.setLockedUntil(null)`.
       2. Saves the cleared user state: `userRepository.save(user)` and returns the user object.
* **Logical Execution Flow**:
  ```
  Find User ──► Check Active Lockout ──► Verify BCrypt Password
                                            /           \
                                         MATCH        MISMATCH
                                         /                 \
                               Reset Security metrics    Increment failedAttempts
                               Save User and Return      Lock out for 15m if >= 5
                                                         Save User and Throw Error
  ```
* **"Side of Caution" Safeguards**:
  * **Brute-Force Protection**: The 5-attempt limit and 15-minute lock window are stored persistently in the database. This protects against brute-force attacks across clustered microservice instances, ensuring that attackers cannot bypass the lock by hitting different server containers.
  * **Cryptographic Matching Safety**: Password verification is delegated entirely to the `BCrypt` matching engine, preventing side-channel timing attacks.

##### Method: `loginUserAndIssueTokens(String email, String rawPassword)`
* **Signature**: `@Transactional public AuthResponse loginUserAndIssueTokens(String email, String rawPassword)`
* **Core Purpose**: Orchestrates credential verification and session initialization in a single transaction.
* **Internal Step-by-Step Execution Flow**:
  1. Authenticates user: `User user = loginUser(email, rawPassword)`.
  2. Generates and returns tokens: `return generateSessionTokens(user)`.
* **"Side of Caution" Safeguards**:
  * **Transaction Integrity**: Marked with `@Transactional`. If generating or saving the persistent `RefreshToken` to the database fails, the entire database transaction is rolled back, ensuring failed sessions leave no orphaned tokens or corrupted user states in the database.

##### Method: `issueTokensForVerifiedUser(User user)`
* **Signature**: `@Transactional public AuthResponse issueTokensForVerifiedUser(User user)`
* **Core Purpose**: Issues access and refresh tokens directly for a user who has just passed OTP verification.
* **Internal Step-by-Step Execution Flow**: Calls and returns `generateSessionTokens(user)`.

##### Method: `generateSessionTokens(User user)`
* **Signature**: `private AuthResponse generateSessionTokens(User user)`
* **Core Purpose**: Creates transient access tokens and persistent refresh token entries.
* **Internal Step-by-Step Execution Flow**:
  1. Generates a signed access JWT: `String accessToken = jwtUtil.generateAccessToken(user)`.
  2. Generates a random session string: `String randomRefreshToken = UUID.randomUUID().toString()`.
  3. Builds a new `RefreshToken` record mapping the user, set to expire in **7 days** (`LocalDateTime.now().plusDays(7)`).
  4. Persists the refresh entity: `refreshTokenRepository.save(refreshTokenEntity)`.
  5. Assembles and returns the unified response DTO: `AuthResponse(accessToken, randomRefreshToken, username)`.
* **"Side of Caution" Safeguards**:
  * **Scope Control**: This helper method is marked `private` to prevent controllers from invoking it directly without first routing requests through the required security, validation, and transaction managers.

##### Method: `resetPassword(String email, String newRawPassword)`
* **Signature**: `@Transactional public void resetPassword(String email, String newRawPassword)`
* **Core Purpose**: Updates a user's password, resetting brute force locks.
* **Internal Step-by-Step Execution Flow**:
  1. Queries user by email: `userRepository.findByEmail(email)`. Throws exception if missing.
  2. Encrypts the password: `String encryptedPassword = passwordEncoder.encode(newRawPassword)`.
  3. Updates the user entity's `passwordHash`.
  4. Resets user failed attempts: `user.setFailedAttempts(0)`.
  5. Clears active lockouts: `user.setLockedUntil(null)`.
  6. Persists changes to database: `userRepository.save(user)`.
* **"Side of Caution" Safeguards**:
  * **Clean Slate Guarantee**: Resetting `failedAttempts` to `0` and clearing `lockedUntil` guarantees that once a user successfully completes a password recovery cycle (via OTP verification), their account is instantly unlocked and ready for access.

##### Method: `refreshAccessToken(String refreshTokenStr)`
* **Signature**: `@Transactional public AuthResponse refreshAccessToken(String refreshTokenStr)`
* **Core Purpose**: Validates a refresh token and issues a new access JWT.
* **Internal Step-by-Step Execution Flow**:
  1. Queries token: `refreshTokenRepository.findByToken(refreshTokenStr)`. Throws `"Invalid refresh token!"` error if missing.
  2. Evaluates expiration:
     `if (refreshTokenEntity.getExpiresAt().isBefore(LocalDateTime.now()))`
     * **If Expired**:
       1. Deletes the expired token from the database immediately: `refreshTokenRepository.delete(refreshTokenEntity)`.
       2. Throws `RuntimeException("Refresh token has expired! Please log in again.")`.
     * **If Valid**:
       1. Resolves user: `User user = refreshTokenEntity.getUser()`.
       2. Generates a new access JWT: `jwtUtil.generateAccessToken(user)`.
       3. Assembles and returns the updated `AuthResponse` DTO containing the new JWT and the existing refresh token.
* **Logical Execution Flow**:
  ```
  Find Refresh Token ──► Verify Expiry ──► Is Expired?
                              │               │
                             YES              NO
                              │               │
                      Delete Token from DB   Generate New JWT Access Token
                      Throw Expiry Exception  Return AuthResponse
  ```
* **"Side of Caution" Safeguards**:
  * **Preventing Orphaned Sessions**: If an expired refresh token is used, it is deleted from the database immediately. This keeps the database clean and prevents orphaned, unusable sessions from piling up.
  * **Stateless Rotation**: The existing refresh token is preserved, updating only the transient access JWT. This minimizes write queries on the database while maintaining security boundaries.

##### Method: `logout(String refreshTokenStr)`
* **Signature**: `@Transactional public void logout(String refreshTokenStr)`
* **Core Purpose**: Terminates a session by deleting its persistent refresh token.
* **Internal Step-by-Step Execution Flow**: Invokes `refreshTokenRepository.deleteByToken(refreshTokenStr)`.
* **"Side of Caution" Safeguards**:
  * **Instant Session Invalidation**: Deleting the refresh token permanently revokes session renewal rights. Even if an attacker has stolen the refresh token, it is now useless.

---

### I. REST Entry Point (Controller Layer)

#### 1. `controller/AuthController.java`
* **Path**: `com.mirror.authservice.controller.AuthController`
* **Role**: Exposes REST API endpoints, parses JSON payloads, coordinates transaction logic in services, and returns appropriate HTTP responses.
* **Annotations**:
  * `@RestController`: Configures the class to serialize return objects directly into JSON payloads in the HTTP response body.
  * `@RequestMapping("/api/auth")`: Binds the base path for all authentication operations.
  * `@RequiredArgsConstructor`: Autowires all final dependencies (services, repositories, utility beans) via constructor injection on startup.

##### Method: `register(RegisterRequest request)`
* **Signature**: `@PostMapping("/signup") public ResponseEntity<?> register(@RequestBody RegisterRequest request)`
* **Core Purpose**: Public API endpoint for creating standard user accounts.
* **Internal Step-by-Step Execution Flow**:
  1. Parses the incoming `RegisterRequest` JSON body.
  2. Delegates registration to `authService.registerUser(request.username(), request.email(), request.password())`.
  3. **If successful**: Returns a `200 OK` response with the body `"User registered successfully with ID: <id>"`.
  4. **If failed**: Catches exceptions (e.g. duplicate username/email) and returns a `400 Bad Request` response with the error message.

##### Method: `login(LoginRequest request)`
* **Signature**: `@PostMapping("/login") public ResponseEntity<?> login(@RequestBody LoginRequest request)`
* **Core Purpose**: Public API endpoint to authenticate users and return access/refresh tokens.
* **Internal Step-by-Step Execution Flow**:
  1. Parses credentials from `LoginRequest`.
  2. Invokes `authService.loginUserAndIssueTokens(request.email(), request.password())`.
  3. **If successful**: Returns a `200 OK` response with the completed `AuthResponse` DTO.
  4. **If failed**: Catches exceptions (lockout, bad credentials) and returns a `401 Unauthorized` response with the error message.

##### Method: `requestOtp(Map<String, String> request)`
* **Signature**: `@PostMapping("/otp/request") public ResponseEntity<?> requestOtp(@RequestBody Map<String, String> request)`
* **Core Purpose**: Public API endpoint to trigger account verification OTP dispatch.
* **Internal Step-by-Step Execution Flow**:
  1. Extracts `email` from the request JSON map.
  2. Looks up user: `userRepository.findByEmail(email)`. Throws exception if user is missing.
  3. Generates OTP: `String code = otpService.generateOtp(email)`.
  4. Sends verification email: `emailService.sendOtpEmail(email, code, user.getUsername(), "VERIFY")`.
  5. Returns a `200 OK` response: `"OTP sent to your email."`.
* **"Side of Caution" Safeguards**:
  * **Dynamic Payloads**: Takes a generic `Map<String, String>` instead of a bulky custom model. This provides flexible payload parsing and avoids exposing internal domain parameters.

##### Method: `verifyOtp(Map<String, String> request)`
* **Signature**: `@PostMapping("/otp/verify") public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> request)`
* **Core Purpose**: Verifies an OTP and activates the user account, returning session tokens on success.
* **Internal Step-by-Step Execution Flow**:
  1. Extracts `email` and `code` from the request map.
  2. Looks up the user: `userRepository.findByEmail(email)`. Throws exception if missing.
  3. Verifies OTP: `boolean isValid = otpService.verifyOtp(user, code)`.
  4. **If Valid**:
     1. Marks user verified: `user.setVerified(true)`.
     2. Saves state: `userRepository.save(user)`.
     3. Issues tokens: `AuthResponse response = authService.issueTokensForVerifiedUser(user)`.
     4. Returns `200 OK` with the `AuthResponse` DTO.
  5. **If Invalid**: Returns a `401 Unauthorized` response: `"Invalid or expired OTP."`.
  6. Catches all other runtime failures and returns a `400 Bad Request` with the error.

##### Method: `requestForgotPasswordOtp(Map<String, String> request)`
* **Signature**: `@PostMapping("/forgot-password/request") public ResponseEntity<?> requestForgotPasswordOtp(@RequestBody Map<String, String> request)`
* **Core Purpose**: Public endpoint to request a password recovery OTP code.
* **Internal Step-by-Step Execution Flow**:
  1. Extracts `email` from request parameters.
  2. Looks up user: `userRepository.findByEmail(email)`. If missing, throws a clear exception: `"No account found with this email address."`.
  3. Generates code: `String code = otpService.generateOtp(email)`.
  4. Sends recovery email: `emailService.sendOtpEmail(email, code, user.getUsername(), "RESET")`.
  5. Returns `200 OK` with the message: `"Password reset OTP sent to your email."`.

##### Method: `verifyForgotPasswordOtp(Map<String, String> request)`
* **Signature**: `@PostMapping("/forgot-password/verify") public ResponseEntity<?> verifyForgotPasswordOtp(@RequestBody Map<String, String> request)`
* **Core Purpose**: Validates a password recovery OTP without applying password changes yet.
* **Internal Step-by-Step Execution Flow**:
  1. Extracts `email` and `code` from request parameters.
  2. Looks up user: `userRepository.findByEmail(email)`.
  3. Verifies OTP: `boolean isValid = otpService.verifyOtp(user, code)`.
  4. **If Valid**: Returns `200 OK` response: `"OTP verified successfully. You may now reset your password."`.
  5. **If Invalid**: Returns `401 Unauthorized` response: `"Invalid or expired OTP."`.

##### Method: `resetPassword(Map<String, String> request)`
* **Signature**: `@PostMapping("/forgot-password/reset") public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request)`
* **Core Purpose**: Exposes the password modification endpoint.
* **Internal Step-by-Step Execution Flow**:
  1. Extracts `email` and new `password` values from request parameters.
  2. **Blank Check Safeguard**:
     Checks if the password is null or empty: `if (newPassword == null || newPassword.trim().isEmpty())`.
     If so, immediately rejects the request with a `400 Bad Request` response: `"Password cannot be empty."`.
  3. Invokes the password reset service: `authService.resetPassword(email, newPassword)`.
  4. Returns `200 OK` response: `"Password reset successfully. Please proceed to login."`.

##### Method: `refresh(Map<String, String> request)`
* **Signature**: `@PostMapping("/refresh") public ResponseEntity<?> refresh(@RequestBody Map<String, String> request)`
* **Core Purpose**: Silent-refresh endpoint to exchange a persistent refresh token for a fresh short-lived access JWT.
* **Internal Step-by-Step Execution Flow**:
  1. Extracts `refreshToken` from the request map.
  2. **Blank Check Safeguard**:
     Checks if the token is null or empty. If so, immediately rejects with a `400 Bad Request`: `"Refresh token missing."`.
  3. Invokes: `AuthResponse response = authService.refreshAccessToken(refreshToken)`.
  4. Returns a `200 OK` response containing the completed `AuthResponse` DTO (new access JWT + existing refresh token).
  5. **If Failed**: Catches exceptions (invalid/expired tokens) and returns a `401 Unauthorized` with the error.

##### Method: `logout(Map<String, String> request)`
* **Signature**: `@PostMapping("/logout") public ResponseEntity<?> logout(@RequestBody Map<String, String> request)`
* **Core Purpose**: Revokes a session by invalidating the refresh token.
* **Internal Step-by-Step Execution Flow**:
  1. Extracts `refreshToken` from the request map.
  2. **Presence Verification**: If the token is not null and not empty, invokes `authService.logout(refreshToken)` to delete the refresh token from the database.
  3. Returns `200 OK` with the message: `"Logged out successfully."`.

---

## 5. End-to-End Execution Flow Blueprints (Logical Traces)

Below are step-by-step traces showing exactly how data passes between files during key operations.

### A. The User Registration Blueprint
```
        [Client Router]
               │ (POSTs JSON body to /api/auth/signup)
               ▼
   [api-gateway (Gateway Filters)]
               │ (Routes to auth-service base url)
               ▼
[AuthController.register(RegisterRequest)]
               │
               │ 1. Passes username, email, password parameters to service layer
               ▼
  [AuthService.registerUser(...)] ──────────────┐
               │                                │
               │ 2. Queries database check      │ 2a. [UserRepository.existsBy...]
               │    for existing profiles       │     Returns true? -> Throws Exception
               ▼                                │
  [PasswordEncoder.encode(raw)]                 │
               │                                │
               │ 3. Generates BCrypt Hash       │
               ▼                                │
     [User.builder().build()]                   │
               │                                │
               │ 4. Builds entity instance      │
               ▼                                │
     [UserRepository.save(User)] ◄──────────────┘
               │
               │ 5. Returns saved User record
               ▼
   [200 OK Response Returned]
```

---

### B. User Login & Lockout Flow Chart
```
         [Client Router]
                │ (POSTs JSON payload to /api/auth/login)
                ▼
[AuthController.login(LoginRequest)]
                │
                │ 1. Invokes service authentication sequence
                ▼
   [AuthService.loginUser(...)] ──────────────┐
                │                             │
                │ 2. Checks active locks      │ 2a. [user.getLockedUntil() != null?]
                │    and fetches user         │     Is future timestamp? -> Throws exception
                ▼                             │
[PasswordEncoder.matches(raw, hashed)] ◄──────┘
                │
        [Match Succeeds?]
         /            \
       YES             NO
       /                 \
  [Success]               [Brute Force Handler]
      │                            │
      │ 3a. Reset failed           │ 3b. Increment failedAttempts
      │     attempts = 0           │     Is count >= 5?
      │                            │      /          \
      │                            │    YES           NO
      │                            │    /               \
      │                            │ [Lockout 15m]    [Normal 401]
      ▼                            ▼      ▼               ▼
[AuthService.generateSessionTokens]  [Save User]     [Save User]
```

---

### C. OTP Generation & Dispatch Flow Chart
```
           [Client Action]
                  │ (POSTs request email to /api/auth/otp/request)
                  ▼
  [AuthController.requestOtp(map)]
                  │
                  │ 1. Queries identity profile mapping
                  ▼
   [UserRepository.findByEmail]
                  │
                  │ 2. Returns User entity or throws exception
                  ▼
    [OtpService.generateOtp] ─────────────────┐
                  │                           │
                  │ 3a. Generates 6-digit code│ 3b. Hashes code (SHA-256)
                  │     "184920"              │     and builds OtpToken entity
                  ▼                           │
   [OtpTokenRepository.save] ◄────────────────┘
                  │
                  │ 4. Commits hashed OTP code to Database
                  ▼
   [EmailService.sendOtpEmail]
                  │
                  │ 5. Dispatches unhashed code "184920" to user's mailbox
                  ▼
    [200 OK Sent back to Client]
```

---

### D. OTP Verification & Login Verification Flow
```
        [Client Verification Entry]
                     │ (Submits OTP Code "184920" to /api/auth/otp/verify)
                     ▼
     [AuthController.verifyOtp(map)]
                     │
                     │ 1. Locates mapped identity user record
                     ▼
        [UserRepository.findByEmail]
                     │
                     │ 2. Invokes cryptographic verification checks
                     ▼
       [OtpService.verifyOtp(User, raw)] ──────────────┐
                     │                                 │
                     │ 3a. Fetches newest unused OTP   │ 3b. Hashes incoming raw code
                     │     record from Database        │     using SHA-256
                     ▼                                 │
           [Compare Hashed Codes] ◄────────────────────┘
                     │
             [Verification Match?]
              /                 \
            YES                  NO
            /                      \
   [Mark OTP used]             [Abort Transaction]
   [Update user.isVerified=true]   [Return 401 Unauthorized]
   [Save Entity records]
            │
            ▼
 [AuthService.issueTokensForVerifiedUser]
            │
            │ 4. Issues dynamic tokens: Access JWT + UUID Refresh Token
            ▼
    [Returns AuthResponse JSON]
```

---

### E. Session Access Token Refresh Flow
```
        [Client Background Scheduler]
                     │ (Detects JWT expiry; sends Refresh UUID to /api/auth/refresh)
                     ▼
       [AuthController.refresh(map)]
                     │
                     │ 1. Resolves token model parameters
                     ▼
    [AuthService.refreshAccessToken(token)] ────────────┐
                     │                                  │
                     │ 2a. Searches mapped DB record    │ 2b. Checks expires_at
                     │     via RefreshTokenRepository   │     Expired? -> Delete and abort
                     ▼                                  │
      [JwtUtil.generateAccessToken] ◄───────────────────┘
                     │
                     │ 3. Issues brand new Access JWT mapping user attributes
                     ▼
         [Returns AuthResponse JSON]
```

---

## 6. Security Summary & Lockout Specifications

The `auth-service` features strict, automated self-defense configurations:

| Parameter | Operational Threshold / Algorithm | Implementation Detail |
| :--- | :--- | :--- |
| **Failed Attempt Limit** | **5 Attempts** | Tracked incrementally per user record in the SQL database. |
| **Lockout Window** | **15 Minutes** | User cannot log in until `locked_until` is in the past. |
| **Verification Expiration** | **5 Minutes** | Generated OTP tokens expire automatically after 5 minutes. |
| **Password Encoder** | **BCrypt** | Hashed dynamically with a random salt generated automatically by Spring. |
| **OTP Hashing Algorithm** | **SHA-256** | Securely hashes the OTP strings in the DB to prevent token snooping. |
| **JWT Expiration** | **15 Minutes** | Short-lived security boundaries for general API requests. |
| **Refresh Token Expiration** | **7 Days** | Long-lived session tokens stored securely inside SQL storage. |

---

## 7. Developer Setup & Environment Configurations

To boot and run the authentication microservice locally:

### A. Environment Configuration Parameters
Ensure your OS or development run configuration has the following environment variables configured:
* `DB_URL`: JDBC database endpoint (e.g. `jdbc:postgresql://localhost:5432/mirror_memory`).
* `DB_USERNAME`: Database connection user role (e.g. `prabhu`).
* `DB_PASSWORD`: Database role connection password (e.g. `rootpassword`).
* `MAIL_USERNAME`: SMTP server authentication address (e.g. standard Google account name).
* `MAIL_PASSWORD`: SMTP server connection password (Google Workspace App-specific password).
* `MAIL_FROM`: Mapped default outgoing mailbox (defaults to `projectmirror.tech@gmail.com`).
* `EUREKA_SERVER_URL`: Local service discovery register host (defaults to `http://localhost:8761/eureka/`).

### B. Execution Terminal Manual
Execute these commands in sequence to compile and boot the subsystem:

1. **Verify Database is Running**:
   Navigate to the root directory `backend/` and verify your Docker container is up:
   ```powershell
   docker compose up -d
   ```
2. **Build and Package Modules**:
   Run the maven build wrapper from the `backend/auth-service/` folder:
   ```powershell
   ./mvnw clean package
   ```
3. **Start the Service Application**:
   Boot the Spring Boot microservice:
   ```powershell
   ./mvnw spring-boot:run
   ```

## 8. Authentication REST API Endpoint Registry

Mirror exposes a secure, standardized JSON-REST API gateway for the authentication subsystem. Below is the definitive registry of endpoints, payloads, HTTP statuses, and functional purposes.

| HTTP Method | API Route | Request Payload Model | Success Status | Error Status | Core System Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`POST`** | `/api/auth/signup` | JSON Record: `{ "username", "email", "password" }` | `200 OK` | `400 Bad Request` | Onboards new users. Validates email and username uniqueness, hashes credentials via BCrypt, and registers a standard account profile. |
| **`POST`** | `/api/auth/login` | JSON Record: `{ "email", "password" }` | `200 OK` | `401 Unauthorized` | Authenticates users. Evaluates database brute-force lockout states, matches password hashes, resets failed counters, and issues session tokens. |
| **`POST`** | `/api/auth/otp/request` | JSON Map: `{ "email" }` | `200 OK` | `400 Bad Request` | Initiates onboarding verification. Generates a raw 6-digit code, commits its SHA-256 hash to database, and dispatches raw text to the user's inbox. |
| **`POST`** | `/api/auth/otp/verify` | JSON Map: `{ "email", "code" }` | `200 OK` | `401 Unauthorized` | Verifies account activation. Matches the OTP hash, enforces single-use replay protection, marks user verified in DB, and issues session tokens. |
| **`POST`** | `/api/auth/forgot-password/request` | JSON Map: `{ "email" }` | `200 OK` | `400 Bad Request` | Initiates password recovery. Issues a recovery OTP, logs its hash to database, and emails security instructions to the registered address. |
| **`POST`** | `/api/auth/forgot-password/verify` | JSON Map: `{ "email", "code" }` | `200 OK` | `401 Unauthorized` | Validates recovery codes. Verifies that the submitted password-reset OTP matches its database hash and is not expired or already used. |
| **`POST`** | `/api/auth/forgot-password/reset` | JSON Map: `{ "email", "password" }` | `200 OK` | `400 Bad Request` | Resets user password. Checks password string boundaries, hashes the new password with BCrypt, clears active locks, and unlocks the account. |
| **`POST`** | `/api/auth/refresh` | JSON Map: `{ "refreshToken" }` | `200 OK` | `401 Unauthorized` | Silent-refresh coordinator. Validates session tokens, purges expired rows from DB, and returns a fresh JWT access token. |
| **`POST`** | `/api/auth/logout` | JSON Map: `{ "refreshToken" }` | `200 OK` | `400 Bad Request` | Terminates active sessions. Permanently deletes the persistent refresh token row from SQL storage, invalidating further token rotations. |

---
*Created by the Mirror Security Team. For modifications, please contact the System Architects.*

