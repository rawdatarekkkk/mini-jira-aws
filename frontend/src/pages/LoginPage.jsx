function LoginPage() {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-xl shadow w-full max-w-md">
          <h1 className="text-2xl font-bold mb-4">Mini Jira Login</h1>
  
          <input className="border p-2 w-full mb-3 rounded" placeholder="Email" />
  
          <input
            className="border p-2 w-full mb-3 rounded"
            placeholder="Password"
            type="password"
          />
  
          <button className="bg-blue-600 text-white w-full p-2 rounded">
            Login
          </button>
        </div>
      </div>
    );
  }
  
  export default LoginPage;