<template>
  <div class="welcome-container">
    <img src="@/assets/adir_logo.png" alt="Adir Logo" class="welcome-logo" />
    <h1>Welcome to Adir</h1>
    <p>Ads Dynamic Image Renderer</p>
    <router-link to="/help" class="help-link">Go to Help Center</router-link>
  </div>
</template>

<style scoped>
.welcome-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  text-align: center;
  gap: 20px;
}

.welcome-logo {
  max-width: 250px;
  height: auto;
  margin-bottom: 10px;
}

.welcome-container h1 {
  font-size: 3.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #42b983 0%, #35495e 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
  letter-spacing: -1px;
}

.welcome-container p {
  font-size: 1.5rem;
  color: #666;
  margin-top: 0;
  font-weight: 300;
}

.help-link {
  margin-top: 20px;
  padding: 10px 20px;
  background-color: #42b983;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.help-link:hover {
  background-color: #35495e;
}
</style>
